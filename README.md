# Tonic Moodboard

Tonic Moodboard is a web application designed for [tonicliving.com](https://tonicliving.com) that allows designers to create and customize mood boards with pillows and text. Users can select pillows from a predefined list, arrange them on a canvas, add text, and export their creations as a PDF.

**Live Demo:** [https://moodboard.siwani.com.np/](https://moodboard.siwani.com.np/)

## Features

- **Create and Manage Moodboards**: Designers can create multiple mood boards, switch between them, and delete them
- **Add and Customize Pillows**: Add pillows to the canvas from a searchable list of Tonic Living products
- **Add and Customize Text**: Add text elements with options to change font weight and size
- **Drag and Drop**: Easily arrange elements on the canvas
- **Remove Background**: Automatically remove backgrounds from pillow images
- **Export to PDF**: Download mood boards as high-quality PDFs
- **Load from File**: Import mood boards from JSON or PDF files
- **Responsive Design**: Works across various screen sizes

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/tonic-moodboard.git
```
2. Navigate to the project directory:
    ```bash
    cd tonic-moodboard
    ```
3. Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

To run the application in development mode, use the following command:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Usage

-   **Create a Moodboard**: Click the "+" button in the header to create a new moodboard.
-   **Select a Pillow**: Use the dropdown menu to search for and select a pillow to add to the gallery.
-   **Add to Canvas**: Drag and drop pillows from the gallery to the canvas, or double-click to add them.
-   **Add Text**: Click the "Add Text" button in the settings panel to add a new text element to the canvas.
-   **Customize Items**: Right-click on an item on the canvas to open the context menu, where you can bring it to the front, send it to the back, or delete it.
-   **Download**: Click the "Download All Mood Boards" button to export all your mood boards as a single PDF file.
-   **Load**: Click the "Load from file" button in the settings panel to load a moodboard from a JSON or PDF file.

## API Endpoints

-   `POST /api/removebg`: Removes the background from an image.
    -   **Body**: `{ "imageUrl": "image-url" }`
-   `POST /api/scrape`: Scrapes a website for product information.
    -   **Body**: `{ "url": "product-url" }`
-   `GET /api/xlsx`: Fetches data from an XLSX file.

## Technologies Used

-   [Next.js](https://nextjs.org/) - React framework for building server-side rendered and static web applications.
-   [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework for rapid UI development.
-   [Zustand](https://github.com/pmndrs/zustand) - A small, fast, and scalable state-management solution for React.
-   [jsPDF](https://github.com/parallax/jsPDF) - A library to generate PDFs in JavaScript.
-   [html2canvas](https://html2canvas.hertzen.com/) - A library to take "screenshots" of webpages or parts of it, directly on the users browser.
-   [Cheerio](https://cheerio.js.org/) - A fast, flexible, and lean implementation of core jQuery designed specifically for the server.
-   [Sharp](https.://sharp.pixelplumbing.com/) - A high-performance Node.js image processing library.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue to discuss any changes.

## License

This project is proprietary software. Unauthorized use, modification, or distribution is strictly prohibited. See [LICENSE.md](LICENSE.md) for full terms.
