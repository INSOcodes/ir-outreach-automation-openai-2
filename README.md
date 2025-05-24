# Product Logo Editor

This application processes client logos and adds them to product images using OpenAI's API, then sends the results via email.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Email Configuration (Gmail)
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM_NAME="Your Company Name"
```

Note: For Gmail, you'll need to use an "App Password" instead of your regular password. You can generate one in your Google Account settings under Security > 2-Step Verification > App passwords.

3. Prepare your `clients.csv` file with the following columns:
   - `Name`: Client's name
   - `Email`: Client's email address
   - `Logo URL`: URL to the client's logo image

4. Create a `product_images` directory and place your product images there:
   - Supported formats: PNG, JPG, JPEG
   - Each image will be processed with the client's logo

## Usage

Run the application:
```bash
npm start
```

The application will:
1. Read client information from `clients.csv`
2. Download each client's logo
3. Process each product image with the client's logo using OpenAI's API
4. Send all processed images to the client via email
5. Clean up temporary files

## Output

- Each client will receive an email with all their customized product images
- The customized images will be saved in the root directory with the naming pattern: `{client_name}_product_{number}.png`
- Temporary logo files are automatically cleaned up after processing 