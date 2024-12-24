# PDF Question-Answering Application

A full-stack application that enables users to upload PDF documents and ask questions about their content. The application uses natural language processing to provide accurate answers based on the document content.

## Features

- **PDF Document Upload**
  - Upload and store PDF documents
  - Extract text content for processing
  - View uploaded document history

- **Interactive Q&A**
  - Ask questions about PDF content
  - Get AI-powered answers using Google's Gemini API
  - Support for follow-up questions
  - Real-time typing indicators

- **Document Management**
  - View list of uploaded documents
  - Delete documents when no longer needed
  - See document upload history

- **User Interface**
  - Clean, modern design
  - Responsive layout
  - Intuitive navigation
  - Loading states and error handling

## Tech Stack

### Backend
- FastAPI - Modern Python web framework
- Python 3.11+ - Programming language
- PyPDF - PDF text extraction
- Google Generative AI - Natural language processing
- Python-multipart - File upload handling
- Python-dotenv - Environment variable management

### Frontend
- React.js - UI library
- Tailwind CSS - Styling
- Axios - HTTP client
- Vite - Build tool

## Setup Instructions

### Prerequisites
- Python 3.11 or higher
- Node.js 16 or higher
- Google API key for Gemini

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a .env file:
   ```
   GOOGLE_API_KEY=your_google_api_key
   ```

5. Run the server:
   ```bash
   python run.py
   ```
   The backend will start on http://localhost:8000

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will start on http://localhost:5173

## API Documentation

### Endpoints

#### `POST /upload`
Upload a PDF document.
- Request: Multipart form data with 'file' field
- Response: Document ID and metadata

#### `POST /ask`
Ask a question about a document.
- Request: JSON with document_id and question
- Response: AI-generated answer

#### `GET /documents`
Get list of uploaded documents.
- Response: Array of documents with metadata

#### `GET /documents/{document_id}`
Get specific document details.
- Response: Document metadata and file path

#### `DELETE /documents/{document_id}`
Delete a document and its associated data.
- Response: Success message

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   └── uploads/         # PDF storage
│   ├── requirements.txt     # Python dependencies
│   └── run.py              # Server startup script
│
└── frontend/
    ├── src/
    │   ├── App.jsx         # Main React component
    │   └── assets/         # Static assets
    ├── package.json        # Node.js dependencies
    └── index.html          # Entry point
```

## Usage Guide

1. **Upload a PDF**
   - Click the "Upload PDF" button
   - Select a PDF file from your computer
   - Wait for upload confirmation

2. **Ask Questions**
   - Type your question in the input field
   - Press Enter or click the send button
   - View the AI-generated answer

3. **Document Management**
   - Click the menu icon to view document history
   - Select a document to view its Q&A history
   - Use the delete button to remove documents

## Error Handling

The application handles various error scenarios:
- Invalid file types
- Upload failures
- API errors
- Network issues
- Missing API keys

## Security Considerations

- File type validation
- Size limits on uploads
- Secure API key storage
- Input sanitization
- Error message sanitization

## Performance Optimizations

- Efficient PDF text extraction
- Optimized API responses
- Lazy loading of documents
- Debounced user inputs
- Caching of responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://reactjs.org/)
- [Google Generative AI](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/) 