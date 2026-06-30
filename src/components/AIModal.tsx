import React, { useState } from 'react';
import { X, Bot, FileText, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Markdown from 'react-markdown';

interface AIModalProps {
  noteId: number;
  noteTitle: string;
  onClose: () => void;
}

export default function AIModal({ noteId, noteTitle, onClose }: AIModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [actionType, setActionType] = useState<'summary' | 'questions' | 'quiz' | null>(null);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const generateAI = async (action: 'summary' | 'questions' | 'quiz') => {
    if (!user) return;
    try {
      setLoading(true);
      setActionType(action);
      setResult(null);
      // Reset quiz state
      setCurrentQuestionIndex(0);
      setQuizScore(0);
      setQuizFinished(false);
      setSelectedOption(null);
      setShowExplanation(false);

      const token = await user.getIdToken();
      const res = await fetch(`/api/notes/${noteId}/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      
      const data = await res.json();
      if (res.ok) {
        setResult(data.result);
      } else {
        alert(data.error || "Failed to generate AI insights");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting AI service");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizAnswer = (option: string) => {
    if (selectedOption) return; // already answered
    setSelectedOption(option);
    setShowExplanation(true);
    
    if (option === result[currentQuestionIndex].correctAnswer) {
      setQuizScore(s => s + 1);
    }
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < result.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizFinished(true);
      // Save quiz score
      if (user) {
        try {
          const token = await user.getIdToken();
          await fetch('/api/quizzes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              noteId,
              score: quizScore + (selectedOption === result[currentQuestionIndex].correctAnswer ? 1 : 0),
              totalQuestions: result.length
            })
          });
        } catch (err) {
          console.error("Failed to save quiz", err);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
          <div className="flex items-center">
            <div className="bg-orange-100 p-2 rounded-lg mr-3">
              <Bot className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Insights</h3>
              <p className="text-xs text-gray-500 line-clamp-1">{noteTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {!loading && !result && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-6">What would you like to generate from this document?</p>
              
              <button 
                onClick={() => generateAI('summary')}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg mr-4">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Generate Summary</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Get a concise overview of key concepts.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              <button 
                onClick={() => generateAI('questions')}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="bg-purple-100 p-2 rounded-lg mr-4">
                    <HelpCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Extract Important Questions</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Identify potential exam questions from the text.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              <button 
                onClick={() => generateAI('quiz')}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-4">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Generate MCQ Quiz</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Test your knowledge with an interactive quiz.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-4"></div>
              <p className="text-sm font-medium text-gray-600">Analyzing document...</p>
              <p className="text-xs text-gray-400 mt-1">This might take a few seconds.</p>
            </div>
          )}

          {!loading && result && (actionType === 'summary' || actionType === 'questions') && (
            <div className="prose prose-sm max-w-none prose-indigo">
              <div className="markdown-body">
                <Markdown>{result}</Markdown>
              </div>
            </div>
          )}

          {!loading && result && actionType === 'quiz' && (
            <div>
              {quizFinished ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Quiz Completed!</h3>
                  <p className="text-gray-500 mt-2 mb-6">You scored {quizScore} out of {result.length}</p>
                  <button
                    onClick={onClose}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-medium text-gray-500">Question {currentQuestionIndex + 1} of {result.length}</span>
                    <span className="text-sm font-medium text-indigo-600">Score: {quizScore}</span>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 mb-6">
                    {result[currentQuestionIndex].question}
                  </h4>
                  
                  <div className="space-y-3">
                    {result[currentQuestionIndex].options.map((option: string, idx: number) => {
                      const isCorrect = option === result[currentQuestionIndex].correctAnswer;
                      const isSelected = option === selectedOption;
                      
                      let optionClasses = "w-full text-left p-4 rounded-xl border transition-all text-sm font-medium ";
                      if (!selectedOption) {
                        optionClasses += "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700";
                      } else if (isCorrect) {
                        optionClasses += "border-green-500 bg-green-50 text-green-700";
                      } else if (isSelected) {
                        optionClasses += "border-red-500 bg-red-50 text-red-700";
                      } else {
                        optionClasses += "border-gray-200 text-gray-400 opacity-50";
                      }

                      return (
                        <button
                          key={idx}
                          disabled={!!selectedOption}
                          onClick={() => handleQuizAnswer(option)}
                          className={optionClasses}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  
                  {showExplanation && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm text-blue-800">
                        <span className="font-bold">Explanation:</span> {result[currentQuestionIndex].explanation}
                      </p>
                    </div>
                  )}

                  {selectedOption && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={nextQuestion}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        {currentQuestionIndex < result.length - 1 ? 'Next Question' : 'Finish Quiz'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
