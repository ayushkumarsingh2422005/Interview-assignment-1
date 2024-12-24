from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Dict, List
import os
import shutil
from pypdf import PdfReader
import google.generativeai as genai
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from . import models, database
from datetime import datetime

# Load environment variables
load_dotenv()

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount the uploads directory
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Configure Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

@app.get("/documents", response_model=List[Dict])
async def get_documents(db: Session = Depends(database.get_db)):
    """Get all documents with their latest questions."""
    documents = db.query(models.Document).all()
    
    result = []
    for doc in documents:
        # Get the latest 3 questions for preview
        latest_questions = db.query(models.Question).filter(
            models.Question.document_id == doc.id
        ).order_by(models.Question.created_at.desc()).limit(3).all()
        
        result.append({
            "id": doc.id,
            "filename": doc.filename,
            "file_url": f"/uploads/{doc.filename}",  # Add file URL
            "created_at": doc.created_at,
            "preview_questions": [
                {
                    "question": q.question_text,
                    "answer": q.answer_text,
                    "created_at": q.created_at
                }
                for q in reversed(latest_questions)
            ]
        })
    
    return result

@app.get("/documents/{document_id}", response_model=Dict)
async def get_document(document_id: int, db: Session = Depends(database.get_db)):
    """Get a specific document with its file content."""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": document.id,
        "filename": document.filename,
        "file_url": f"/uploads/{document.filename}",  # Add file URL
        "created_at": document.created_at
    }

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Save the file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Extract text from PDF
        pdf_reader = PdfReader(file_path)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        
        # Save to database
        db_document = models.Document(
            filename=file.filename,
            file_path=file_path,
            text_content=text
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        
        return {
            "message": "PDF uploaded successfully",
            "document_id": db_document.id,
            "file_url": f"/uploads/{file.filename}"  # Add file URL
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask")
async def ask_question(
    request: Dict,
    db: Session = Depends(database.get_db)
):
    try:
        document_id = request.get("document_id")
        question_text = request.get("question")
        
        if not document_id or not question_text:
            raise HTTPException(status_code=400, detail="Missing document_id or question")
        
        # Get document from database
        document = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Create prompt for Gemini
        prompt = f"""Based on the following text from a PDF document, please answer the question.
        If the answer cannot be found in the text, say "I cannot find the answer in the document."
        
        Text: {document.text_content[:30000]}
        
        Question: {question_text}
        
        Answer:"""
        
        # Get answer from Gemini
        response = model.generate_content(prompt)
        answer = response.text.strip()
        
        # Save question and answer to database
        db_question = models.Question(
            document_id=document_id,
            question_text=question_text,
            answer_text=answer
        )
        db.add(db_question)
        db.commit()
        
        return {"answer": answer}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents/{document_id}/questions", response_model=List[Dict])
async def get_document_questions(
    document_id: int,
    db: Session = Depends(database.get_db)
):
    """Get all questions and answers for a specific document."""
    questions = db.query(models.Question).filter(
        models.Question.document_id == document_id
    ).order_by(models.Question.created_at.asc()).all()
    
    return [
        {
            "id": q.id,
            "question": q.question_text,
            "answer": q.answer_text,
            "created_at": q.created_at
        }
        for q in questions
    ]

@app.delete("/documents/{document_id}")
async def delete_document(document_id: int, db: Session = Depends(database.get_db)):
    """Delete a document and its associated questions."""
    try:
        # Get the document
        document = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete the file if it exists
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        # Delete associated questions first (due to foreign key constraint)
        db.query(models.Question).filter(models.Question.document_id == document_id).delete()
        
        # Delete the document
        db.delete(document)
        db.commit()
        
        return {"message": "Document deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) 