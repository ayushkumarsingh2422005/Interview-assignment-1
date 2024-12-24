import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [question, setQuestion] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [documentId, setDocumentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Load all documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Load question history when document is selected
  useEffect(() => {
    if (documentId) {
      loadQuestionHistory();
      loadDocumentDetails();
    }
  }, [documentId]);

  const loadDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await axios.get(`${API_BASE_URL}/documents`);
      setDocuments(response.data);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const loadDocumentDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/${documentId}`);
      setSelectedFile(new File([''], response.data.filename, { type: 'application/pdf' }));
      setFileUrl(`${API_BASE_URL}${response.data.file_url}`);
    } catch (err) {
      setError('Failed to load document details');
    }
  };

  const loadQuestionHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await axios.get(`${API_BASE_URL}/documents/${documentId}/questions`);
      const history = response.data.map(item => ([
        { type: 'question', content: item.question },
        { type: 'answer', content: item.answer }
      ])).flat();
      setMessages(history);
    } catch (err) {
      setError('Failed to load question history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setIsUploading(true);
      setError(null);
      
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        setSelectedFile(file);
        setFileUrl(URL.createObjectURL(file));
        setDocumentId(response.data.document_id);
        setMessages([]); // Clear messages when new document is uploaded
        loadDocuments(); // Refresh document list
      } catch (err) {
        setError(err.response?.data?.detail || 'Error uploading PDF');
        setSelectedFile(null);
        setFileUrl(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        setSelectedFile(file);
        setFileUrl(URL.createObjectURL(file));
        setDocumentId(response.data.document_id);
        setMessages([]); // Clear messages when new document is uploaded
        loadDocuments(); // Refresh document list
      } catch (err) {
        setError(err.response?.data?.detail || 'Error uploading PDF');
        setSelectedFile(null);
        setFileUrl(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (question.trim() && documentId) {
      const newQuestion = { type: 'question', content: question };
      setMessages(prev => [...prev, newQuestion]);
      setQuestion('');
      setIsTyping(true);

      try {
        const response = await axios.post(`${API_BASE_URL}/ask`, {
          document_id: documentId,
          question: question.trim(),
        });

        const answerMessage = { type: 'answer', content: response.data.answer };
        setMessages(prev => [...prev, answerMessage]);
        loadDocuments(); // Refresh document list to update previews
      } catch (err) {
        setError(err.response?.data?.detail || 'Error getting answer');
        const errorMessage = { type: 'error', content: 'Failed to get answer. Please try again.' };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleDocumentSelect = (docId) => {
    setDocumentId(docId);
  };

  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation(); // Prevent document selection when clicking delete
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/documents/${docId}`);
      
      // If the deleted document was selected, clear the selection
      if (docId === documentId) {
        setSelectedFile(null);
        setFileUrl(null);
        setDocumentId(null);
        setMessages([]);
      }
      
      // Refresh the document list
      loadDocuments();
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  const handlePDFClick = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const MessageBubble = ({ message, index }) => {
    if (message.type === 'question') {
      return (
        <div className="flex items-start justify-end gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-4 max-w-[80%]">
            {message.content}
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
            S
          </div>
        </div>
      );
    } else if (message.type === 'error') {
      return (
        <div className="flex items-start gap-3 mb-4">
          <img src="/ai-planet-logo.svg" alt="AI Planet" className="w-8 h-8" />
          <div className="bg-red-50 text-red-600 rounded-lg p-4 max-w-[80%]">
            {message.content}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-start gap-3 mb-4">
          <img src="/ai-planet-logo.svg" alt="AI Planet" className="w-8 h-8" />
          <div className="bg-gray-50 rounded-lg p-4 max-w-[80%]">
            {message.content}
          </div>
        </div>
      );
    }
  };

  const TypingIndicator = () => (
    <div className="flex items-start gap-3 mb-4">
      <img src="/ai-planet-logo.svg" alt="AI Planet" className="w-8 h-8" />
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex items-center">
              <img src="/ai-planet-logo.svg" alt="AI Planet" className="h-10" />
              <div className="ml-2">
                <span className="text-xl font-bold">planet</span>
                <div className="text-xs text-gray-500">formerly DPhi</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {selectedFile && (
              <button 
                onClick={handlePDFClick}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="text-sm">{selectedFile.name}</span>
              </button>
            )}
            <label className="cursor-pointer flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-sm font-medium">Upload PDF</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute inset-y-0 left-0 w-80 bg-white shadow-lg">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Document History</h2>
                <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-gray-100 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {isLoadingDocuments ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        doc.id === documentId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => {
                        handleDocumentSelect(doc.id);
                        setShowSidebar(false);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{doc.filename}</h3>
                          <p className="text-sm text-gray-500">{formatDate(doc.created_at)}</p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Delete document"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                      {doc.preview_questions.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {doc.preview_questions.map((q, i) => (
                            <div key={i} className="text-sm">
                              <p className="text-gray-700">Q: {q.question}</p>
                              <p className="text-gray-500">A: {q.answer}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-6 flex flex-col h-[calc(100vh-73px)]">
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}
        
        {!selectedFile ? (
          <div className="flex-1 flex items-center justify-center">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                <p className="mt-4 text-gray-600">Uploading PDF...</p>
              </div>
            ) : (
              <div 
                className="w-full max-w-2xl"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="relative">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Send a message..."
                    className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    disabled={true}
                  />
                  <button
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600"
                    disabled={true}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto py-8">
              <div className="space-y-4">
                {isLoadingHistory ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <MessageBubble key={index} message={message} index={index} />
                    ))}
                    {isTyping && <TypingIndicator />}
                  </>
                )}
              </div>
            </div>
            
            {/* Question Input */}
            <div className="py-4">
              <form onSubmit={handleQuestionSubmit} className="relative">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Send a message..."
                  className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!documentId || isUploading || isLoadingHistory}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
