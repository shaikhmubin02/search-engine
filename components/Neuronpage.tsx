'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Sparkles, History, Bookmark, Brain, Settings, ChevronDown ,ChevronRight, ChevronLeft, PlusCircle, Trash2, User, Edit2, TrendingUp, Pencil, MoreVertical, Check, Share2, Clipboard, Info, Lock, Menu, Home, FileText, DollarSign, BookOpen, CircleEllipsis, CircleEllipsisIcon, Package, Repeat, RectangleEllipsis, SquareChevronRight, Clock, BookmarkCheck } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { MemoryInput } from './MemoryInput'
import { SignedOut, SignedIn, UserButton, SignInButton, useUser } from '@clerk/nextjs'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Marquee from "@/components/magicui/marquee"
import { randomQuestions, scienceQuestions, technologyQuestions } from '@/data/marqueeData'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Feedback } from './Feedback'
import { ModeToggle } from './Modetoggle'
import { FileUploader } from './FileUploader'
import { KeyboardEvent } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatHistory {
  _id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  isTitleEdited: boolean
  isShared: boolean
  isBookmarked: boolean // Added field
  sharedFromShareId?: string
}

export default function Neuronpage() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false)
  const [isBookmarkSidebarOpen, setIsBookmarkSidebarOpen] = useState(false) // New state for Bookmark Sidebar
  const [memory, setMemory] = useState('')
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false)
  const { isSignedIn, user, isLoaded } = useUser()
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false)
  const [anonymousQueriesCount, setAnonymousQueriesCount] = useState(0)
  const [isSearchDisabled, setIsSearchDisabled] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const latestAnswerRef = useRef<HTMLDivElement>(null)
  const [isSignInAlertOpen, setIsSignInAlertOpen] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editedMessage, setEditedMessage] = useState('')
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editedTitle, setEditedTitle] = useState('')
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [shareableLink, setShareableLink] = useState('')
  const { toast } = useToast()
  const router = useRouter()
  const [selectedModel, setSelectedModel] = useState("llama3-8b-8192")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [expandedResponseTime, setExpandedResponseTime] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [visionQuery, setVisionQuery] = useState('')
  const [visionResponse, setVisionResponse] = useState<string | null>(null)
  const [isVisionLoading, setIsVisionLoading] = useState(false)
  const [visionMessages, setVisionMessages] = useState<Array<{ role: 'user' | 'assistant', content: string | { type: string, text?: string, image_url?: { url: string } }[] }>>([])
  const [activeTab, setActiveTab] = useState("focus")

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        // Fetch chat histories from API
        const fetchChatHistories = async () => {
          try {
            const response = await axios.get('/api/chats')
            setChatHistories(response.data)
            // Removed createNewChat() to prevent automatic chat creation on sign-in
          } catch (error) {
            console.error('Error fetching chat histories:', error)
          }
        }

        fetchChatHistories()

        // Load memory from API on component mount
        const fetchMemory = async () => {
          try {
            const memoryResponse = await axios.get('/api/memory')
            setMemory(memoryResponse.data.memory)
          } catch (error) {
            console.error('Error fetching memory:', error)
          }
        }

        fetchMemory()
      } else {
        // Reset state and create a new anonymous chat
        resetToAnonymousState()
      }
    }
  }, [isSignedIn, isLoaded])

  const resetToAnonymousState = () => {
    const anonymousChatId = 'anonymous'
    setChatHistories([{
      _id: anonymousChatId,
      title: 'Anonymous Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTitleEdited: false,
      isShared: false,
      isBookmarked: false // Initialize as not bookmarked
    }])
    setCurrentChatId(anonymousChatId)
    setMessages([])
    setMemory('')
    setAnonymousQueriesCount(0)
    setIsSearchDisabled(false)
    setIsHistorySidebarOpen(false)
    setIsBookmarkSidebarOpen(false) // Close bookmark sidebar
  }

  const createNewChat = async () => {
    if (isSignedIn && user) {
      // Create a new chat in the database
      try {
        const response = await axios.post('/api/chats', {
          userId: user.id,
          title: 'New Chat',
          messages: []
        })
        setChatHistories(prev => [response.data, ...prev])
        setCurrentChatId(response.data._id)
        setMessages([])
        setIsHistorySidebarOpen(true) // Open the history sidebar
      } catch (error) {
        console.error('Error creating new chat:', error)
      }
    } else {
      // For anonymous users, create a new chat locally
      const newChatId = Date.now().toString()
      const newChat: ChatHistory = {
        _id: newChatId,
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTitleEdited: false,
        isShared: false,
        isBookmarked: false
      }
      setChatHistories(prev => [newChat, ...prev])
      setCurrentChatId(newChatId)
      setMessages([])
    }
  }

  const handleNewChat = () => {
    createNewChat()
    setIsHistorySidebarOpen(true)
    setIsBookmarkSidebarOpen(false) // Close bookmark sidebar if open
  }

  const handleSearch = useCallback(async (searchQuery?: string, editedMessageIndex?: number) => {
    const queryToSearch = searchQuery || query
    if (!queryToSearch.trim()) return

    if (!isSignedIn) {
      if (anonymousQueriesCount >= 5) {
        setIsAlertDialogOpen(true)
        setIsSearchDisabled(true)
        return
      }
      setAnonymousQueriesCount(prev => prev + 1)
    }

    // **Create a new chat if there's no active chat**
    if (isSignedIn && !currentChatId) {
      await createNewChat()
    }

    setIsLoading(true)
    const startTime = Date.now()
    const newMessage: Message = { role: 'user', content: queryToSearch }
    let updatedMessages: Message[]

    if (editedMessageIndex !== undefined) {
      // If editing a message, remove all subsequent messages
      updatedMessages = [...messages.slice(0, editedMessageIndex), newMessage]
    } else {
      updatedMessages = [...messages, newMessage]
    }

    setMessages(updatedMessages)
    setQuery('') // Clear the search bar
    setEditingMessageId(null) // Reset editing state

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: isSignedIn 
            ? [
                { role: 'system', content: "You are an AI assistant. Avoid sharing personal opinions or identifiers." }, 
                ...updatedMessages
              ] 
            : updatedMessages,
          userId: isSignedIn ? user.id : 'anonymous',
          model: selectedModel
        }),
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let assistantMessageIndex = updatedMessages.length

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value)
          setMessages(prevMessages => {
            const newMessages = [...prevMessages]
            if (newMessages[assistantMessageIndex] && newMessages[assistantMessageIndex].role === 'assistant') {
              newMessages[assistantMessageIndex].content += chunk
            } else {
              newMessages.push({ role: 'assistant', content: chunk })
            }
            return newMessages
          })
        }
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime
      setResponseTime(totalTime)

      // Update chat history only if user is signed in
      if (isSignedIn && currentChatId) {
        const currentChat = chatHistories.find(chat => chat._id === currentChatId)
        if (currentChat && !currentChat.isTitleEdited && currentChat.messages.length === 1) {
          // If it's a new chat and the title hasn't been edited, update the title
          const newTitle = queryToSearch.slice(0, 30) + (queryToSearch.length > 30 ? '...' : '')
          const updateResponse = await axios.put(`/api/chats/${currentChatId}`, {
            title: newTitle,
            messages: [...updatedMessages, { role: 'assistant', content: assistantMessageIndex >= 0 ? "" : "" }]
          })
          setChatHistories(prev => prev.map(chat => 
            chat._id === currentChatId ? { ...updateResponse.data, isTitleEdited: false } : chat
          ))
        } else {
          // For existing chats or if the title has been edited, just update the messages
          const updateResponse = await axios.put(`/api/chats/${currentChatId}`, {
            messages: [...updatedMessages, { role: 'assistant', content: "" }]
          })
          setChatHistories(prev => prev.map(chat => 
            chat._id === currentChatId ? { ...chat, messages: updateResponse.data.messages } : chat
          ))
        }
      }
    } catch (error) {
      console.error('Error fetching response:', error)
      const errorMessage: Message = { role: 'assistant', content: 'An error occurred while processing your request.' }
      setMessages(prevMessages => [...prevMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [
    query,
    isSignedIn,
    anonymousQueriesCount,
    createNewChat,
    currentChatId,
    chatHistories,
    selectedModel,
    messages,
  ])

  // Add useEffect to handle scrolling when messages change
  useEffect(() => {
    scrollToLatestAnswer()
  }, [messages])

  const scrollToLatestAnswer = () => {
    if (latestAnswerRef.current) {
      latestAnswerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  const selectChat = (chatId: string) => {
    const selectedChat = chatHistories.find(chat => chat._id === chatId)
    if (selectedChat) {
      setCurrentChatId(chatId)
      setMessages(selectedChat.messages)
    }
  }

  const toggleHistorySidebar = () => {
    setIsHistorySidebarOpen(!isHistorySidebarOpen)
    if (!isHistorySidebarOpen) {
      setIsBookmarkSidebarOpen(false) // Close bookmark sidebar when opening history sidebar
    }
  }

  const toggleBookmarkSidebar = () => {
    setIsBookmarkSidebarOpen(!isBookmarkSidebarOpen)
    if (!isBookmarkSidebarOpen) {
      setIsHistorySidebarOpen(false) // Close history sidebar when opening bookmark sidebar
    }
  }

  const deleteChat = async (chatId: string) => {
    if (isSignedIn) {
      // Delete chat from the database
      try {
        await axios.delete(`/api/chats/${chatId}`)
        setChatHistories(prev => prev.filter(chat => chat._id !== chatId))
        
        if (currentChatId === chatId) {
          const remainingChats = chatHistories.filter(chat => chat._id !== chatId)
          if (remainingChats.length > 0) {
            setCurrentChatId(remainingChats[0]._id)
            setMessages(remainingChats[0].messages)
          } else {
            setCurrentChatId(null) // No active chat
            setMessages([])
          }
        }
      } catch (error) {
        console.error('Error deleting chat:', error)
      }
    } else {
      // For anonymous users, delete chat locally
      setChatHistories(prev => prev.filter(chat => chat._id !== chatId))
      
      if (currentChatId === chatId) {
        const remainingChats = chatHistories.filter(chat => chat._id !== chatId)
        if (remainingChats.length > 0) {
          setCurrentChatId(remainingChats[0]._id)
          setMessages(remainingChats[0].messages)
        } else {
          setCurrentChatId(null) // No active chat
          setMessages([])
        }
      }
    }
  }

  const saveMemory = async (newMemory: string) => {
    if (!isSignedIn) {
      alert('Please sign in to save memory.')
      return
    }
    try {
      await axios.post('/api/memory', { memory: newMemory })
      setMemory(newMemory)
      setIsMemoryDialogOpen(false)
    } catch (error) {
      console.error('Error saving memory:', error)
    }
  }

  const handleHistoryOrNewChat = () => {
    if (!isSignedIn) {
      setIsSignInAlertOpen(true)
    } else {
      handleNewChat()
    }
  }

  const handleHistoryClick = () => {
    if (isSignedIn) {
      toggleHistorySidebar()
    } else {
      setIsSignInAlertOpen(true)
    }
  }

  const handleBookmarkClick = () => {
    if (isSignedIn) {
      toggleBookmarkSidebar()
    } else {
      setIsSignInAlertOpen(true)
    }
  }

  const handleReRun = (index: number) => {
    const messageToReRun = messages[index];
    console.log('Message to re-run:', messageToReRun);
    if (messageToReRun.role === 'user') {
      console.log('Re-running user message:', messageToReRun.content);
      handleSearch(messageToReRun.content, index);
    } else if (index > 0 && messages[index - 1].role === 'user') {
      console.log('Re-running previous user message:', messages[index - 1].content);
      handleSearch(messages[index - 1].content, index - 1);
    } else {
      console.log('Cannot re-run: no user message found');
    }
  };

  const handleBookmark = async (chat: ChatHistory) => {
    try {
      const response = await axios.put(`/api/chats/${chat._id}`, {
        isBookmarked: !chat.isBookmarked
      })
      setChatHistories(prev => prev.map(c => 
        c._id === chat._id ? { ...c, isBookmarked: response.data.isBookmarked } : c
      ))
      toast({
        title: chat.isBookmarked ? 'Removed Bookmark' : 'Bookmarked',
        description: chat.isBookmarked ? 'Chat has been removed from bookmarks.' : 'Chat has been added to bookmarks.',
      })
    } catch (error) {
      console.error('Error updating bookmark:', error)
      toast({
        title: 'Error',
        description: 'Failed to update bookmark.',
        variant: 'destructive',
      })
    }
  }

  const handleQuestionClick = (question: string) => {
    handleSearch(question)
  }

  const handleEditMessage = (index: number) => {
    setEditingMessageId(index)
    setEditedMessage(messages[index].content)
  }

  const handleSaveEdit = (index: number) => {
    handleSearch(editedMessage, index)
  }

  const handleEditTitle = (chatId: string, currentTitle: string) => {
    setEditingTitleId(chatId)
    setEditedTitle(currentTitle)
  }

  const handleSaveTitle = async (chatId: string) => {
    if (!editedTitle.trim()) {
      setEditingTitleId(null)
      return
    }

    try {
      const response = await axios.put(`/api/chats/${chatId}`, {
        title: editedTitle.trim(),
        isTitleEdited: true
      })
      
      setChatHistories(prev => prev.map(chat => 
        chat._id === chatId ? { ...chat, title: response.data.title, isTitleEdited: true } : chat
      ))
      setEditingTitleId(null)
    } catch (error) {
      console.error('Error updating chat title:', error)
    }
  }

  const handleShareChat = async (chat: ChatHistory) => {
    try {
      console.log('Attempting to share chat:', chat._id);
      // Open the share dialog
      setIsShareDialogOpen(true);

      // Make API call to generate a shareable link
      const response = await axios.post('/api/chats/share', { chatId: chat._id });

      console.log('Share API response:', response.data);
      const { shareableLink } = response.data;
      setShareableLink(shareableLink);
    } catch (error) {
      console.error('Error sharing chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate shareable link.',
        variant: 'destructive',
      });
      setIsShareDialogOpen(false);
    }
  };

  const handleImageUpload = useCallback((file: File) => {
    setSelectedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
      // Add the image to the visionMessages
      setVisionMessages(prev => [...prev, {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: reader.result as string }
          }
        ]
      }])
    }
    reader.readAsDataURL(file)
  }, [])

  const handleVisionSearch = async () => {
    if (!visionQuery) return

    setIsVisionLoading(true)
    try {
      const newMessage = {
        role: 'user' as const,
        content: visionQuery
      }
      setVisionMessages(prev => [...prev, newMessage])

      const response = await axios.post('/api/vision', {
        messages: [...visionMessages, newMessage]
      })

      setVisionMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: response.data.content
      }])
      setVisionQuery('')
    } catch (error) {
      console.error('Error processing vision request:', error)
      setVisionMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: 'An error occurred while processing your request.'
      }])
    } finally {
      setIsVisionLoading(false)
    }
  }

  const handleVisionKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isVisionLoading) {
      handleVisionSearch()
    }
  }

  // Reset shareable link when dialog closes
  useEffect(() => {
    if (!isShareDialogOpen) {
      setShareableLink('');
    }
  }, [isShareDialogOpen]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-2 right-2 z-30 text-black hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <SquareChevronRight className="h-5 w-5  text-gray-700" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[250px] sm:w-[300px] bg-white p-0">
          <div className="flex flex-col h-full">
            {/* User section */}
            <div className="py-6 px-4 bg-gradient-to-r from-green-400 to-blue-500">
              {isSignedIn ? (
                <div className="">
                  <UserButton />
                </div>
              ) : (
                <SignInButton mode="modal">
                  <Button variant="outline" className="w-full justify-start  text-white bg-transparent border-white hover:bg-white hover:text-green-500 transition-colors duration-200">
                    <User className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </SignInButton>
              )}
            </div>
            
            {/* Main menu items */}
            <div className="flex-1 py-4 px-2 space-y-1">
              {[
                { icon: PlusCircle, label: "New Chat", onClick: handleHistoryOrNewChat },
                { icon: History, label: "History", onClick: handleHistoryClick },
                { icon: Bookmark, label: "Bookmarks", onClick: handleBookmarkClick }, // Added Bookmark
                { icon: Brain, label: "Memory", onClick: () => setIsMemoryDialogOpen(true) },
                { icon: TrendingUp, label: "Trending Topics", onClick: () => {} },
                { icon: Bookmark, label: "Bookmarks", onClick: handleBookmarkClick }, // Duplicate removed
              ].map((item, index) => (
                <Button 
                  key={index}
                  variant="ghost" 
                  className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-green-500 transition-colors duration-200"
                  onClick={() => {
                    item.onClick()
                    setIsMobileSidebarOpen(false)
                  }}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-green-500 transition-colors duration-200">
                    <CircleEllipsisIcon className="mr-2 h-4 w-4" />
                    Navigation
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {[
                    { emoji: "🏠", label: "About", path: "/landing" },
                    { emoji: "💲", label: "Pricing", path: "/landing/pricing" },
                    { emoji: "📃", label: "Docs", path: "/docs" },
                    { emoji: "📖", label: "Blog", path: "/landing/blog" },
                  ].map((item, index) => (
                    <DropdownMenuItem key={index} onClick={() => router.push(item.path)}>
                      {item.emoji} {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Sidebar (hidden on mobile) */}
      <div className="w-12 bg-white border-r border-gray-200 p-2 hidden md:flex flex-col items-center shadow-sm fixed h-full z-20">
        {/* Top section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex-1 flex items-center justify-center mt-3">
            <Sparkles className="h-6 w-6 text-green-500" />
          </div>
          <div className="w-8 h-px bg-gray-200 mb-2"></div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full hover:bg-green-50 transition-colors"
                  onClick={handleHistoryOrNewChat}
                >
                  <PlusCircle className="h-4 w-4 text-gray-600" />
                  <span className="sr-only">New Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className='font-mono text-sm font-thin text-gray-600 bg-white border-1 shadow-md'>
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full hover:bg-green-50 transition-colors"
                  onClick={handleHistoryClick}
                >
                  <History className="h-4 w-4 text-gray-600" />
                  <span className="sr-only">History</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className='font-mono text-sm font-thin text-gray-600 bg-white border-1 shadow-md'>
                <p>History</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {/* Middle section */}
        <div className="flex-1 flex flex-col items-center justify-center mb-10">
          <nav className="flex flex-col items-center space-y-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Dialog open={isMemoryDialogOpen} onOpenChange={setIsMemoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost"  
                        size="icon" 
                        className="w-8 h-8 rounded-full hover:bg-green-50 transition-colors"
                      >
                        <Brain className="h-4 w-4 text-gray-600" />
                        <span className="sr-only">Memory</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px] bg-white border-none shadow-lg">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-gray-900">AI Memory</DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Set instructions or context for the AI to remember across all conversations.
                        </DialogDescription>
                      </DialogHeader>
                      <MemoryInput initialMemory={memory} onSave={saveMemory} maxCharacters={10000} />
                      <DialogFooter className="mt-6">
                        <div className="text-sm text-gray-500">
                          This memory will be applied to all future conversations.
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TooltipTrigger>
                <TooltipContent side="right" className='font-mono text-sm font-thin text-gray-600 bg-white border-1 shadow-md'>
                  <p>Memory</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 rounded-full hover:bg-green-50 transition-colors"
                    onClick={() => {/* Add trending topics functionality */}}
                  >
                    <TrendingUp className="h-4 w-4 text-gray-600" />
                    <span className="sr-only">Trending Topics</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className='font-mono text-sm font-thin text-gray-600 bg-white border-1 shadow-md'>
                  <p>Trending Topics</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full hover:bg-green-50 transition-colors"
                  onClick={handleBookmarkClick} // Bookmark Button Click Handler
                >
                  <Bookmark className="h-4 w-4 text-gray-600" />
                  <span className="sr-only">Bookmarks</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className='font-mono text-sm font-thin text-gray-600 bg-white border-1 shadow-md'>
                <p>Bookmarks</p>
              </TooltipContent>
            </Tooltip>
            </TooltipProvider>
          </nav>
        </div>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col items-center space-y-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* <ModeToggle /> */}
              </TooltipTrigger>
              <TooltipContent side="right" className='font-mono text-sm font-thin text-gray-600 bg-white border-1 shadow-md'>
                <p>Theme</p>
              </TooltipContent> 
            </Tooltip>
            {/* New Navigation Menu Dropdown */}
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8 rounded-full hover:bg-green-50 transition-colors"
                    >
                      <CircleEllipsisIcon className="h-5 w-5 text-gray-600" />
                      <span className="sr-only">Navigation</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className='font-mono ml-3'>
                    <DropdownMenuItem onClick={() => router.push('/landing')}>
                      🏠
                      About
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/landing/pricing')}>
                      💲
                      Pricing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/docs')}>
                      📃
                      Docs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/landing/blog')}>
                      📖
                      Blog
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="right" className='font-mono text-sm font-thin text-gray-600 bg-white border-1 shadow-md'>
                <p>Navigation</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                {isSignedIn ? (
                  <UserButton />
                ) : (
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-green-50 transition-colors">
                      <User className="h-4 w-4 text-gray-600" />
                    </Button>
                  </SignInButton>
                )}
              </TooltipTrigger>
              <TooltipContent side="right" className='font-mono text-sm font-thin text-gray-600 bg-white border-1 shadow-md'>
                <p>{isSignedIn ? 'Account' : 'Sign In'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* History Sidebar - Only show for signed-in users */}
      {isSignedIn && (
        <div className={`w-56 lg:ml-12 bg-white border-r border-gray-200 fixed h-full transition-transform duration-300 ease-in-out ${isHistorySidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-10 flex flex-col`}>
          <div className="p-3 border-b border-gray-200 flex justify-between items-center mt-14">
            <p className="text-gray-600 font-serif font-normal">Previous Chats</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleHistorySidebar}
              className="h-6 w-6"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="space-y-2">
              {chatHistories.map(chat => (
                <div key={chat._id} className="flex items-center space-x-2">
                  {editingTitleId === chat._id ? (
                    <div className="flex-grow flex items-center">
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="mr-2 text-sm text-gray-800"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle(chat._id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveTitle(chat._id)}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant={chat._id === currentChatId ? "secondary" : "ghost"}
                        className={`flex-grow justify-start text-left truncate text-sm font-thin ${
                          chat._id === currentChatId ? 'text-gray-800 font-medium' : 'text-gray-800'
                        }`}
                        onClick={() => selectChat(chat._id)}
                      >
                        {chat.title}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className='font-mono'>
                          <DropdownMenuItem onClick={() => handleEditTitle(chat._id, chat.title)}>
                            <Edit2 className='h-4 w-4 ml-1 mr-2' />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBookmark(chat)} className="text-gray-600">
                            {chat.isBookmarked ? (
                              <>
                                <BookmarkCheck className='h-4 w-4 ml-1 mr-2' />
                                Remove Bookmark
                              </>
                            ) : (
                              <>
                                <Bookmark className='h-4 w-4 ml-1 mr-2' />
                                Bookmark
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareChat(chat)}>
                            <Share2 className='h-4 w-4 ml-1 mr-2' />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteChat(chat._id)} className="text-red-600">
                            <Trash2 className='h-4 w-4 ml-1 mr-2' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* Bookmark Sidebar - Only show for signed-in users */}
      {isSignedIn && (
        <div className={`w-56 lg:ml-12 bg-white border-r border-gray-200 fixed h-full transition-transform duration-300 ease-in-out ${isBookmarkSidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-10 flex flex-col`}>
          <div className="p-3 border-b border-gray-200 flex justify-between items-center mt-14">
            <p className="text-gray-600 font-serif font-normal">Bookmarked Chats</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleBookmarkSidebar}
              className="h-6 w-6"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="space-y-2">
              {chatHistories.filter(chat => chat.isBookmarked).map(chat => (
                <div key={chat._id} className="flex items-center space-x-2">
                  {editingTitleId === chat._id ? (
                    <div className="flex-grow flex items-center">
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="mr-2 text-sm text-gray-800"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle(chat._id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveTitle(chat._id)}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant={chat._id === currentChatId ? "secondary" : "ghost"}
                        className={`flex-grow justify-start text-left truncate text-sm font-thin ${
                          chat._id === currentChatId ? 'text-gray-800 font-medium' : 'text-gray-800'
                        }`}
                        onClick={() => selectChat(chat._id)}
                      >
                        {chat.title}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className='font-mono'>
                          <DropdownMenuItem onClick={() => handleEditTitle(chat._id, chat.title)}>
                            <Edit2 className='h-4 w-4 ml-1 mr-2' />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBookmark(chat)} className="text-gray-600">
                            {chat.isBookmarked ? (
                              <>
                                <BookmarkCheck className='h-4 w-4 ml-1 mr-2' />
                                Remove Bookmark
                              </>
                            ) : (
                              <>
                                <Bookmark className='h-4 w-4 ml-1 mr-2' />
                                Bookmark
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareChat(chat)}>
                            <Share2 className='h-4 w-4 ml-1 mr-2' />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteChat(chat._id)} className="text-red-600">
                            <Trash2 className='h-4 w-4 ml-1 mr-2' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              ))}
              {chatHistories.filter(chat => chat.isBookmarked).length === 0 && (
                <p className="text-gray-500 text-sm text-center mt-4">No bookmarks yet.</p>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden md:ml-12">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-2 px-3 shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-bold text-gray-800">Neuron AI</h1>
            <p className="text-xs text-gray-600">Get answers at lightning speed. (hypothetically)</p>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-2 pb-16">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            <Tabs defaultValue="focus" className="flex-1 flex flex-col" onValueChange={(value) => setActiveTab(value)}>
              <TabsList className="mb-2 justify-start">
                <TabsTrigger value="focus" className="px-4 py-1">Focus</TabsTrigger>
                <TabsTrigger value="vision" className="px-4 py-1">Vision</TabsTrigger>
                <TabsTrigger value="copilot" className="px-4 py-1">Copilot</TabsTrigger>
              </TabsList>
              <TabsContent value="focus" className="flex-1 overflow-hidden">
                <Card className="h-full flex flex-col mb-6">
                  <CardContent className="p-3 flex-1 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1" ref={scrollAreaRef}>
                      <div className="pt-4 pb-16">
                        {messages.length > 0 ? (
                          messages.map((message, index) => (
                            <div 
                              key={index} 
                              className={`mb-4 ${
                                message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                              }`}
                              ref={message.role === 'assistant' && index === messages.length - 1 ? latestAnswerRef : null}
                            >
                              {message.role === 'assistant' ? (
                                <div className="flex items-start space-x-2 relative">
                                  {/* AI Profile Picture */}
                                  <div className="flex-shrink-0 w-5 h-5 mt-1">
                                    <Sparkles className="h-4 w-4 text-green-500" />
                                  </div>
                                  <div className="relative w-full">
                                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pb-8">
                                      {message.content}
                                    </div>
                                    {/* Optional: Add a loader or typing indicator */}
                                    {isLoading && index === messages.length - 1 && (
                                      <div className="loader">...</div>
                                    )}
                                    {/* Buttons container */}
                                    <div className="absolute bottom-0 left-0 flex space-x-2">
                                      {/* Copy Button */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => {
                                          navigator.clipboard.writeText(message.content)
                                          toast({
                                            title: 'Copied!',
                                            description: 'The message has been copied to your clipboard.',
                                          })
                                          // Change button text to "Copied!"
                                          const button = document.querySelector(`#copy-button-${index}`) as HTMLButtonElement;
                                          if (button) {
                                            const originalContent = button.innerHTML;
                                            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-gray-600"><path d="M20 6 9 17l-5-5"/></svg>';
                                            button.disabled = true;
                                            setTimeout(() => {
                                              button.innerHTML = originalContent;
                                              button.disabled = false;
                                            }, 2000);
                                          }
                                        }}
                                        aria-label="Copy message"
                                        id={`copy-button-${index}`}
                                      >
                                        <Clipboard className="h-4 w-4 text-gray-600" />
                                      </Button>

                                      {/* Re-run Button */}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        onClick={() => {
                                          handleReRun(index);
                                        }}
                                      >
                                        <Repeat className="h-4 w-4 text-gray-600" />
                                      </Button>

                                      {/* Model Selection Button */}
                                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                                        <SelectTrigger className="h-5 w-5 p-0 border-none [&>svg]:hidden shadow-none">
                                          <SelectValue>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                              <Package className="h-4 w-4 mt-2 text-gray-600" />
                                            </Button>
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem className="text-muted-foreground" value="llama3-8b-8192">Meta Llama </SelectItem>
                                          <SelectItem className="text-muted-foreground" value="gemma-7b-it">Google Gemma</SelectItem>
                                          <SelectItem className="text-muted-foreground" value="llama-3.2-90b-text-preview">Meta Llama 3.2</SelectItem>
                                        </SelectContent>
                                      </Select>

                                      {/* Response Time Button (Response time:) */}
                                      {responseTime !== null && (
                                        <div className="relative flex items-center">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 p-0"
                                            onMouseEnter={() => setExpandedResponseTime(responseTime)}
                                            onMouseLeave={() => setExpandedResponseTime(null)}
                                            onClick={() => setExpandedResponseTime(expandedResponseTime === responseTime ? null : responseTime)}
                                          >
                                            <Clock className="h-4 w-4 text-gray-600" />
                                          </Button>
                                          <div 
                                            className={`absolute left-full ml-1 transition-all duration-300 ease-in-out overflow-hidden ${
                                              expandedResponseTime === responseTime ? 'w-40 opacity-100' : 'w-0 opacity-0'
                                            }`}
                                          >
                                            <span className="text-xs text-gray-600 whitespace-nowrap">
                                              {responseTime}ms
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start space-x-2">
                                  {/* User Message aligned to the right */}
                                  <div className={`inline-block p-2 rounded-lg bg-green-100 relative group`}>
                                    {editingMessageId === index ? (
                                      <div className="flex items-center">
                                        <Input
                                          value={editedMessage}
                                          onChange={(e) => setEditedMessage(e.target.value)}
                                          className="mr-2"
                                        />
                                        <Button onClick={() => handleSaveEdit(index)} size="sm">Save</Button>
                                      </div>
                                    ) : (
                                      <div className='flex -space-x-2'>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditMessage(index)}
                                          className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 h-full flex flex-col items-center justify-center mt-8 md:mt-12 lg:mt-16">
                            {/* **Show Marquee and Initial Interface Only for Signed-In Users** */}
                            {isSignedIn && (
                              <>
                                <Sparkles className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-green-500 mb-2" />
                                <p className="text-sm md:text-base font-medium">Ask a question to get started!</p>
                                <p className="text-xs mt-1 mb-4 px-4 md:px-0">Type your query in the search bar below or choose from our suggestions</p>
                                <div className="w-full max-w-4xl overflow-hidden space-y-2 mb-3 mt-3 px-2 md:px-4 lg:px-0">
                                  <div className="relative">
                                    <Marquee className="py-1 md:py-2 rounded" pauseOnHover={true} repeat={2} speed={80}>
                                      {randomQuestions.map((item, index) => (
                                        <div
                                          key={index}
                                          className="mx-2 md:mx-3 lg:mx-4 cursor-pointer hover:text-green-500 transition-colors whitespace-nowrap text-xs md:text-sm"
                                          onClick={() => handleQuestionClick(item.question)}
                                        >
                                          {item.emoji} {item.question}
                                        </div>
                                      ))}
                                    </Marquee>
                                  </div>
                                  <div className="relative">
                                    <Marquee className="py-1 md:py-2 rounded" pauseOnHover={true} repeat={2} speed={90}>
                                      {scienceQuestions.map((item, index) => (
                                        <div
                                          key={index}
                                          className="mx-2 md:mx-3 lg:mx-4 cursor-pointer hover:text-green-500 transition-colors whitespace-nowrap text-xs md:text-sm"
                                          onClick={() => handleQuestionClick(item.question)}
                                        >
                                          {item.emoji} {item.question}
                                        </div>
                                      ))}
                                    </Marquee>
                                  </div>
                                  <div className="relative">
                                    <Marquee className="py-1 md:py-2 rounded" pauseOnHover={true} repeat={2} speed={100}>
                                      {technologyQuestions.map((item, index) => (
                                        <div
                                          key={index}
                                          className="mx-2 md:mx-3 lg:mx-4 cursor-pointer hover:text-purple-500 transition-colors whitespace-nowrap text-xs md:text-sm"
                                          onClick={() => handleQuestionClick(item.question)}
                                        >
                                          {item.emoji} {item.question}
                                        </div>
                                      ))}
                                    </Marquee>
                                  </div>
                                </div>
                              </>
                            )}
                            {!isSignedIn && (
                              <>
                                <Sparkles className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-green-500 mb-2" />
                                <p className="text-sm md:text-base font-medium">Ask a question to get started!</p>
                                <p className="text-xs mt-1 mb-4 px-4 md:px-0">Type your query in the search bar below or choose from our suggestions</p>
                                <div className="w-full max-w-4xl overflow-hidden space-y-2 mb-3 mt-3 px-2 md:px-4 lg:px-0">
                                  <div className="relative">
                                    <Marquee className="py-1 md:py-2 rounded" pauseOnHover={true} repeat={2} speed={80}>
                                      {randomQuestions.map((item, index) => (
                                        <div
                                          key={index}
                                          className="mx-2 md:mx-3 lg:mx-4 cursor-pointer hover:text-blue-500 transition-colors whitespace-nowrap text-xs md:text-sm"
                                          onClick={() => handleQuestionClick(item.question)}
                                        >
                                          {item.emoji} {item.question}
                                        </div>
                                      ))}
                                    </Marquee>
                                  </div>
                                  <div className="relative">
                                    <Marquee className="py-1 md:py-2 rounded" pauseOnHover={true} repeat={2} speed={80}>
                                      {scienceQuestions.map((item, index) => (
                                        <div
                                          key={index}
                                          className="mx-2 md:mx-3 lg:mx-4 cursor-pointer hover:text-green-500 transition-colors whitespace-nowrap text-xs md:text-sm"
                                          onClick={() => handleQuestionClick(item.question)}
                                        >
                                          {item.emoji} {item.question}
                                        </div>
                                      ))}
                                    </Marquee>
                                  </div>
                                  <div className="relative">
                                    <Marquee className="py-1 md:py-2 rounded" pauseOnHover={true} repeat={2} speed={90}>
                                      {technologyQuestions.map((item, index) => (
                                        <div
                                          key={index}
                                          className="mx-2 md:mx-3 lg:mx-4 cursor-pointer hover:text-purple-500 transition-colors whitespace-nowrap text-xs md:text-sm"
                                          onClick={() => handleQuestionClick(item.question)}
                                        >
                                          {item.emoji} {item.question}
                                        </div>
                                      ))}
                                    </Marquee>
                                  </div>
                                </div>
                                {!isSignedIn && (
                                  <SignInButton mode="modal">
                                    <p className="text-xs mt-4 text-green-500 cursor-pointer hover:underline px-4 md:px-0">
                                      Sign in to save chat history and set AI memory
                                    </p>
                                  </SignInButton>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="vision" className="flex-1 overflow-hidden">
                <Card className="h-full flex flex-col mb-6">
                  <CardContent className="p-3 flex-1 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1" ref={scrollAreaRef}>
                      <div className="pt-4 pb-16">
                        {visionMessages.length > 0 ? (
                          visionMessages.map((message, index) => (
                            <div 
                              key={index} 
                              className={`mb-4 ${
                                message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                              }`}
                            >
                              {message.role === 'assistant' ? (
                                <div className="flex items-start space-x-2 relative">
                                  <div className="flex-shrink-0 w-5 h-5 mt-1">
                                    <Sparkles className="h-4 w-4 text-green-500" />
                                  </div>
                                  <div className="relative w-full">
                                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pb-8">
                                      {Array.isArray(message.content) 
                                        ? message.content.map((content, i) => 
                                            content.type === 'image_url' 
                                              ? <img key={i} src={content.image_url?.url} alt="Uploaded" className="max-w-full h-auto max-h-64 rounded-lg mb-2" />
                                              : <p key={i}>{content.text}</p>
                                          )
                                        : message.content
                                      }
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start space-x-2">
                                  <div className="inline-block relative group">
                                    {Array.isArray(message.content) 
                                      ? message.content.map((content, i) => 
                                        content.type === 'image_url' 
                                          ? <img key={i} src={content.image_url?.url} alt="Uploaded" className="max-w-full h-auto max-h-64 rounded-lg mb-2" />
                                            : <div key={i} className="p-2 rounded-lg bg-green-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content.text}</div>
                                        )
                                      : <div className="p-2 rounded-lg bg-green-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{message.content}</div>
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 h-full flex flex-col items-center justify-center mt-8 md:mt-12 lg:mt-16">
                            <Sparkles className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-green-500 mb-2" />
                            <p className="text-sm md:text-base font-medium">Upload an image and ask questions about it!</p>
                            <p className="text-xs mt-1 mb-4 px-4 md:px-0">Our AI will analyze the image and provide insights</p>
                            <div className="w-64 h-32 mb-4">
                              <FileUploader onFileSelect={handleImageUpload} />
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="copilot" className="flex-1 overflow-hidden">
                <Card className="h-full">
                  <CardContent className="p-3 h-full flex items-center justify-center">
                    <p className="text-center text-gray-500 text-sm">This feature is coming soon. Stay tuned for updates!</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Bottom Search Bar - Only show for Focus and Copilot tabs */}
        {activeTab !== "vision" && (
          <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-gradient-to-t from-gray-100 to-transparent md:ml-12">
            <div className="max-w-4xl mx-auto w-full flex justify-center">
              <div className="relative w-full max-w-2xl">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder={isSearchDisabled ? "Sign in to ask more questions" : "Ask anything..."}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isSearchDisabled && handleSearch()}
                  className={`pl-12 pr-20 py-3 text-sm rounded-full border-2 border-gray-200  text-gray-800 bg-white shadow-lg w-full ${isSearchDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isSearchDisabled}
                />
                <Button 
                  size="sm" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full text-xs px-4 py-2"
                  onClick={() => handleSearch()}
                  disabled={isLoading || isSearchDisabled}
                >
                  {isLoading ? (
                    'Searching...'
                  ) : (
                    <div className="flex items-center">
                      Ask <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Search Bar for Vision tab */}
        {activeTab === "vision" && (
          <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-gradient-to-t from-gray-100 to-transparent md:ml-12">
            <div className="max-w-4xl mx-auto w-full flex justify-center">
              <div className="relative w-full max-w-2xl">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Ask about the image..."
                  value={visionQuery}
                  onChange={(e) => setVisionQuery(e.target.value)}
                  onKeyDown={handleVisionKeyDown}
                  className="pl-12 pr-20 py-3 text-sm rounded-full border-2 border-gray-200 focus:border-green-500 transition-colors text-gray-800 bg-white shadow-lg w-full"
                />
                <Button 
                  size="sm" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full text-xs px-4 py-2"
                  onClick={handleVisionSearch}
                  disabled={isVisionLoading}
                >
                  {isVisionLoading ? (
                    'Analyzing...'
                  ) : (
                    <div className="flex items-center">
                      Ask <ChevronRight className="h-3 w-3 ml-1" />
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Component */}
      <Feedback />

      {/* Alert Dialog for maximum queries reached */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-900 mb-2">Sign in required</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 text-base">
              You&apos;ve reached the maximum number of queries for anonymous users. Please sign in to continue asking questions and enjoy unlimited access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <SignInButton mode="modal">
              <AlertDialogAction 
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
              >
                Sign In
              </AlertDialogAction>
            </SignInButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog for non-signed-in users trying to access history or bookmark */}
      <AlertDialog open={isSignInAlertOpen} onOpenChange={setIsSignInAlertOpen}>
        <AlertDialogContent className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-900 mb-2">Sign in required</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 text-base">
              Please sign in to access chat history, bookmarks, and create new chats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <SignInButton mode="modal">
              <AlertDialogAction 
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
              >
                Sign In
              </AlertDialogAction>
            </SignInButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[450px] bg-white border-none shadow-lg rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <Share2 className="h-6 w-6 mr-2 text-green-500" />
              Share Chat
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Share this chat by copying the link below and sending it to others.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Shareable Link</p>
              <div className="flex items-center">
                <Input
                  type="text"
                  value={shareableLink}
                  readOnly
                  className="flex-1 mr-2 text-gray-600 bg-white border-gray-300 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(shareableLink)
                    toast({
                      title: 'Link Copied',
                      description: 'The shareable link has been copied to your clipboard.',
                    })
                    // Change button text to "Link Copied"
                    const button = document.querySelector('.copy-link-button') as HTMLButtonElement;
                    if (button) {
                      button.innerHTML = '<svg class="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Link Copied';
                      button.disabled = true;
                      setTimeout(() => {
                        button.innerHTML = '<svg class="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>Copy Link';
                        button.disabled = false;
                      }, 2000);
                    }
                  }}
                  className="whitespace-nowrap text-gray-600 copy-link-button"
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>
            <div className="mt-6 text-sm text-gray-500">
              <p className="flex items-center mb-2">
                <Info className="h-4 w-4 mr-2 text-green-500" />
                This link allows others to view this chat.
              </p>
              <p className="flex items-center">
                <Lock className="h-4 w-4 mr-2 text-blue-500" />
                Your chat history and personal information remain private.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button onClick={() => setIsShareDialogOpen(false)} variant="ghost" className="mr-2 text-gray-600">
              Cancel
            </Button>
            <Button onClick={() => setIsShareDialogOpen(false)} className="bg-green-600 hover:bg-green-700 text-white">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}