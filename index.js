import { parse } from "csv-parse";
import fs from "fs";
import axios from "axios";
import OpenAI, { toFile } from "openai";
import nodemailer from "nodemailer";

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

// Function to download image from URL
async function downloadImage(url, outputPath) {
    const response = await axios({
        url,
        responseType: "arraybuffer",
    });
    await fs.promises.writeFile(outputPath, response.data);
    return outputPath;
}

async function sendEmail(client, imagePath) {
    const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
        to: client.Email,
        subject: "Your Customized Lid Design",
        text: `Dear ${client.Name},\n\nWe are pleased to share your customized lid design. ` +
            "Please find the attached image.\n\nBest regards,\n" + EMAIL_FROM_NAME,
        attachments: [{
            filename: "customized_lid.png",
            path: imagePath,
        }],
    };

    try {
        await transporter.sendMail(mailOptions);
        process.stdout.write(`Email sent to ${client.Email}\n`);
    } catch (error) {
        process.stderr.write(`Failed to send email to ${client.Email}: ${error.message}\n`);
    }
}

async function processClient(client, lidImage) {
    const logoPath = `${client.Name.replace(/\s+/g, "_")}_logo.png`;
    await downloadImage(client["Logo URL"], logoPath);

    const clientLogo = await toFile(fs.createReadStream(logoPath), null, {
        type: "image/png",
    });

    const prompt = "Add the client logo to the center of the lid, making it " +
        "prominent but not overwhelming. Ensure the logo is clearly visible " +
        "and properly scaled.";

    const response = await openAIClient.images.edit({
        model: "gpt-image-1",
        image: [lidImage, clientLogo],
        prompt,
        n: 1,
        size: "auto",
        quality: "low",
    });

    const imageBase64 = response.data[0].b64_json;
    const imageBytes = Buffer.from(imageBase64, "base64");
    const outputPath = `${client.Name.replace(/\s+/g, "_")}_lid_with_logo.png`;
    fs.writeFileSync(outputPath, imageBytes);

    fs.unlinkSync(logoPath);
    return outputPath;
}

async function addLogoToLid() {
    try {
        const clients = await readClientsFromCSV("clients.csv");
        const lidImage = await toFile(fs.createReadStream("lid.png"), null, {
            type: "image/png",
        });

        for (const client of clients) {
            const outputPath = await processClient(client, lidImage);
            process.stdout.write(
                `Successfully processed ${client.Name}: ${outputPath}\n`
            );

            if (client.Email) {
                await sendEmail(client, outputPath);
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
addLogoToLid();