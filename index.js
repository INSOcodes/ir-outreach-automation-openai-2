import { parse } from "csv-parse";
import fs from "fs";
import axios from "axios";
import OpenAI, { toFile } from "openai";
import nodemailer from "nodemailer";
import path from "path";

// Load environment variables
const {
    OPENAI_API_KEY,
    EMAIL_USER,
    EMAIL_PASSWORD,
    EMAIL_FROM_NAME = "Your Company Name",
} = process.env;

if (!OPENAI_API_KEY || !EMAIL_USER || !EMAIL_PASSWORD) {
    process.stderr.write(
        "Error: Missing required environment variables. " +
        "Please check your .env file.\n"
    );
    process.exit(1);
}

// Initialize OpenAI client
const openAIClient = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
    },
});

// Function to read and parse CSV file
async function readClientsFromCSV(filePath) {
    const clients = [];
    const parser = fs
        .createReadStream(filePath)
        .pipe(parse({ columns: true, trim: true }));

    for await (const record of parser) {
        clients.push(record);
    }
    return clients;
}

async function getProductImages(productImagesDir = "product_images") {
    const files = await fs.promises.readdir(productImagesDir);
    return files
        .filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file))
        .map(file => path.join(productImagesDir, file));
}

// Function to download image from URL
async function downloadImage(url, outputPath) {
    const response = await axios({
        url,
        responseType: "arraybuffer",
    });
    await fs.promises.writeFile(outputPath, response.data);
    return outputPath;
}

async function sendEmail(client, processedImages) {
    const mailTemplate = fs.readFileSync("email.txt", "utf8");
    const mailText = mailTemplate
        .replace("{{client_name}}", client.ContactName != "" ? client.ContactName : "there")
        .replace("{{client_company_name}}", client.Name);

    const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
        to: client.Email,
        subject: "Aged & Charred Purchase Order - Cocktail Smoker Kits",
        text: mailText,
        attachments: processedImages.map((imagePath, index) => ({
            filename: `customized_product_${index + 1}.png`,
            path: imagePath,
        })),
    };

    try {
        await transporter.sendMail(mailOptions);
        process.stdout.write(`Email sent to ${client.Email}\n`);
    } catch (error) {
        process.stderr.write(`Failed to send email to ${client.Email}: ${error.message}\n`);
    }
}

async function processImage(productImage, clientLogo, productImageMask) {
    if (productImageMask) {
        console.log("Product image mask found");
    }
    const prompt = "Add the client logo to the center of the product, making it " +
        "prominent but not overwhelming. Ensure the logo is clearly visible " +
        "and properly scaled. Client logo should be small. Logo should be only added once." +
        `${productImageMask ? " Place logo within mask." : ""}`;

    const editObject = {
        model: "gpt-image-1",
        image: [productImage, clientLogo],
        prompt,
        n: 1,
        size: "auto",
        quality: "high",
    };
    if (productImageMask) {
        editObject.mask = productImageMask;
    }
    const response = await openAIClient.images.edit(editObject);

    const imageBase64 = response.data[0].b64_json;
    const imageBytes = Buffer.from(imageBase64, "base64");
    return imageBytes;
}

async function processClient(client, productImages, productImageMasks) {
    const logoPath = `downloaded_images/${client.Name.replace(/\s+/g, "_")}_logo.png`;
    await downloadImage(client["Logo URL"], logoPath);

    const clientLogo = await toFile(fs.createReadStream(logoPath), null, {
        type: "image/png",
    });

    const processedImages = [];
    for (const [index, productImagePath] of productImages.entries()) {
        let productImageMask;
        const productImage = await toFile(fs.createReadStream(productImagePath), null, {
            type: "image/png",
        });

        // Find mask file with the same name as the product image
        const maskPath = productImageMasks.find(mask => mask.includes(productImagePath.split("/").pop().split(".")[0]));

        if (maskPath) {
            productImageMask = await toFile(fs.createReadStream(maskPath), null, {
                type: "image/png",
            });
        }

        const imageBytes = await processImage(productImage, clientLogo, productImageMask);
        const outputPath = `generated_images/${client.Name.replace(/\s+/g, "-")}_Smoke-Lid-Kit_${index + 1}.png`;
        fs.writeFileSync(outputPath, imageBytes);
        processedImages.push(outputPath);

        process.stdout.write(
            `Processed product ${index + 1} for ${client.Name}\n`
        );
    }

    fs.unlinkSync(logoPath);
    return processedImages;
}

async function addLogoToProducts() {
    try {
        const clients = await readClientsFromCSV("clients.csv");
        const productImages = await getProductImages("products");
        const productImageMasks = await getProductImages("products_masks");
        const productImagesNoConversion = await getProductImages("product_images_no_conversion");

        if (productImages.length === 0) {
            process.stderr.write("No product images found in product_images directory\n");
            process.exit(1);
        }

        for (const client of clients) {
            process.stdout.write(
                `Processing client ${client.Name}\n`
            );
            const processedImages = await processClient(client, productImages, productImageMasks);
            process.stdout.write(
                `Successfully processed all products for ${client.Name}\n`
            );

            if (client.Email) {
                await sendEmail(client, [...processedImages, ...productImagesNoConversion]);
            } else {
                process.stderr.write(
                    `No email address provided for ${client.Name}\n`
                );
            }
        }
    } catch (error) {
        process.stderr.write(`Error: ${error.message}\n`);
        process.exit(1);
    }
}

// Run the function
addLogoToProducts();