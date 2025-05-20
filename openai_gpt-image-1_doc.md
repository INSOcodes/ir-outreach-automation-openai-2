```markdown
# OpenAI Image Generation API — JavaScript Guide

This guide explains how to generate and edit images using OpenAI's API with JavaScript. It covers the latest GPT Image model, DALL·E 2, and DALL·E 3, including code samples and output customization.

---

## Overview

The OpenAI API allows you to generate and edit images from text prompts using GPT Image or DALL·E models.

-  **API:** [Image API](https://platform.openai.com/docs/api-reference/images) (generations, edits, variations)
-  **Customization:** Set quality, size, format, compression, and transparency.

### Endpoints

| Endpoint      | Capability                                            |
|:------------- |:-----------------------------------------------------|
| Generations   | Generate images from text prompts                     |
| Edits         | Modify existing images with new prompts or masks      |
| Variations    | Generate variations of an image (DALL·E 2 only)       |

---

## Model Comparison

| Model        | Endpoints                          | Use Case                                                      |
|:------------ |:-----------------------------------|:--------------------------------------------------------------|
| DALL·E 2     | Generations, Edits, Variations     | Lower cost, concurrent requests, inpainting (with mask)       |
| DALL·E 3     | Generations only                   | Higher quality, larger resolutions                            |
| GPT Image    | Generations, Edits                 | Best instruction following, text rendering, detailed editing  |

> **Note:** GPT Image is recommended for most use cases.

---

## Generate Images

Create images from text using the `images.generate` endpoint.

```js
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI();

const prompt = `
A children's book drawing of a veterinarian using a stethoscope to 
listen to the heartbeat of a baby otter.
`;

const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
});

// Save the image to a file
const image_base64 = result.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("otter.png", image_bytes);
```

-  Use the `n` parameter to generate multiple images per request.

---

## Edit Images

### Create a New Image Using References

Use multiple images as references to generate a new one.

```js
import fs from "fs";
import OpenAI, { toFile } from "openai";

const client = new OpenAI();

const imageFiles = [
    "bath-bomb.png",
    "body-lotion.png",
    "incense-kit.png",
    "soap.png",
];

const images = await Promise.all(
    imageFiles.map(async (file) =>
        await toFile(fs.createReadStream(file), null, {
            type: "image/png",
        })
    ),
);

const rsp = await client.images.edit({
    model: "gpt-image-1",
    image: images,
    prompt: "Create a lovely gift basket with these four items in it",
});

// Save the image
const image_base64 = rsp.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("basket.png", image_bytes);
```

---

### Edit an Image Using a Mask (Inpainting)

Upload an image and a mask to edit only specific areas.

```js
import fs from "fs";
import OpenAI, { toFile } from "openai";

const client = new OpenAI();

const rsp = await client.images.edit({
    model: "gpt-image-1",
    image: await toFile(fs.createReadStream("sunlit_lounge.png"), null, {
        type: "image/png",
    }),
    mask: await toFile(fs.createReadStream("mask.png"), null, {
        type: "image/png",
    }),
    prompt: "A sunlit indoor lounge area with a pool containing a flamingo",
});

// Save the image
const image_base64 = rsp.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("lounge.png", image_bytes);
```

**Mask requirements:**
-  The image and mask must have the same format and size (<25MB).
-  The mask image must have an alpha channel (transparency).

---

## Customize Image Output

You can configure:

| Option       | Description                                           | Values / Example                |
|:------------ |:-----------------------------------------------------|:-------------------------------|
| Size         | Image dimensions                                     | `1024x1024`, `1024x1536`, `auto` |
| Quality      | Rendering quality                                    | `low`, `medium`, `high`, `auto` |
| Format       | Output file format                                   | `png` (default), `jpeg`, `webp` |
| Compression  | JPEG/WebP compression (0–100%)                       | `output_compression: 50`        |
| Background   | Transparent or opaque                                | `transparent`, `opaque`, `auto` |

Example: Generate a transparent PNG sprite sheet.

```js
import OpenAI from "openai";
import fs from "fs";
const openai = new OpenAI();

const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: "Draw a 2D pixel art style sprite sheet of a tabby gray cat",
    size: "1024x1024",
    background: "transparent",
    quality: "high",
});

const image_base64 = result.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("sprite.png", image_bytes);
```

---

## Limitations

-  **Latency:** Complex prompts may take up to 2 minutes.
-  **Text Rendering:** Improved, but not always perfect.
-  **Consistency:** May struggle with recurring characters/brands across generations.
-  **Composition:** May have difficulty with precise element placement.

---

## Content Moderation

All prompts and images are filtered per [content policy](https://labs.openai.com/policies/content-policy).

-  `moderation` parameter:
    - `"auto"` (default): Standard filtering
    - `"low"`: Less restrictive filtering

---

## Cost and Latency

-  Cost/latency depend on image size and quality (more tokens = higher cost).
-  Output tokens per image:

| Quality | 1024×1024 | 1024×1536 | 1536×1024 |
|:------- |:----------|:----------|:----------|
| Low     | 272       | 408       | 400       |
| Medium  | 1056      | 1584      | 1568      |
| High    | 4160      | 6240      | 6208      |

**Total cost = input text tokens + input image tokens (for edits) + output image tokens.**  
See [pricing](https://platform.openai.com/pricing#image-generation) for details.

---

## References

-  [OpenAI Image API Docs](https://platform.openai.com/docs/api-reference/images)
-  [Image Generation Cookbook](https://cookbook.openai.com/examples/generate_images_with_gpt_image)
-  [Content Policy](https://labs.openai.com/policies/content-policy)
```


