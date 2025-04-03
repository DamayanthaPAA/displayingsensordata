'use client';
import { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';
import Image from 'next/image';
import { FiRefreshCw, FiFilter, FiDownload, FiMaximize, FiWifi, FiWifiOff } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const newMessageIds = useRef(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Filter messages based on active filter
  const filteredMessages = messages.filter(msg => {
    if (activeFilter === 'all') return true;
    return msg.topic.includes(activeFilter);
  });

  useEffect(() => {
    const connectToBroker = () => {
      const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_URL, {
        username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
        reconnectPeriod: 3000,
        clientId: `web-client-${Math.random().toString(16).substr(2, 8)}`
      });

      client.on('connect', () => {
        console.log('Connected to MQTT broker');
        setConnectionStatus('connected');
        setIsLoading(false);
        client.subscribe('image/#');
        client.subscribe('image/process/result');
        client.subscribe('image/processed');
      });

      client.on('message', (topic, payload) => {
        try {
          const payloadStr = payload.toString();
          const message = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            topic,
            payload: payloadStr,
            timestamp: new Date(),
            isNew: true,
            isImage: topic.includes('image') && isBase64Image(payloadStr)
          };

          setMessages(prev => [message, ...prev.slice(0, 99)]); // Keep latest 100
          newMessageIds.current.add(message.id);

          setTimeout(() => {
            newMessageIds.current.delete(message.id);
            setMessages(prev => prev.map(msg => 
              msg.id === message.id ? { ...msg, isNew: false } : msg
            ));
          }, 3000);
        } catch (err) {
          console.error('Error processing message:', err);
        }
      });

      client.on('error', (err) => {
        console.error('Connection error:', err);
        setConnectionStatus('error');
        setIsLoading(false);
      });

      client.on('close', () => {
        setConnectionStatus('disconnected');
      });

      return client;
    };

    const client = connectToBroker();

    return () => {
      client.end();
    };
  }, []);

  function isBase64Image(str) {
    try {
      const json = JSON.parse(str);
      return json.imageData && (
        json.imageData.startsWith('/9j/') || 
        json.imageData.startsWith('iVBORw0KGgo') ||
        json.imageData.startsWith('PHN2Zy')
      );
    } catch {
      return false;
    }
  }

  function extractImageData(payload) {
    try {
      const data = JSON.parse(payload);
      if (data.imageData) {
        const format = data.metadata?.format || 'jpeg';
        return `data:image/${format};base64,${data.imageData}`;
      }
      return null;
    } catch {
      return null;
    }
  }

  function downloadImage(imageUrl, imageId) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `mqtt-image-${imageId || Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function formatTimestamp(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getConnectionIcon() {
    switch (connectionStatus) {
      case 'connected': return <FiWifi className="text-green-500" />;
      case 'error': return <FiWifiOff className="text-red-500" />;
      default: return <FiRefreshCw className="text-yellow-500 animate-spin" />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">MQTT Image Stream</h1>
            <p className="text-gray-600 mt-1">Real-time visualization dashboard</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
              {getConnectionIcon()}
              <span className="text-sm font-medium capitalize">
                {connectionStatus === 'connected' ? 'Live' : connectionStatus}
              </span>
            </div>
            
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            >
              <FiFilter />
              <span className="text-sm font-medium">Filter</span>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-white rounded-lg shadow-sm mb-6"
            >
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'all', label: 'All Images' },
                  { value: 'processed', label: 'Processed' },
                  { value: 'result', label: 'Results' },
                  { value: 'raw', label: 'Raw' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => {
                      setActiveFilter(filter.value);
                      setIsFilterOpen(false);
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeFilter === filter.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <div className="h-10 w-10 bg-blue-200 rounded-full"></div>
              <p className="text-gray-500">Connecting to broker...</p>
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">
              {connectionStatus === 'connected' 
                ? "No images received yet. Waiting for MQTT messages..." 
                : "Cannot receive messages while disconnected"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredMessages.map((msg) => {
                const imageUrl = extractImageData(msg.payload);
                
                return (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className={`bg-white rounded-xl shadow-sm overflow-hidden relative ${
                      msg.isNew ? 'ring-2 ring-blue-500' : ''
                    } hover:shadow-md transition-shadow`}
                  >
                    {imageUrl ? (
                      <div className="relative aspect-square bg-gray-100 group">
                        <Image
                          src={imageUrl}
                          alt={`MQTT Image ${msg.id}`}
                          fill
                          className="object-contain"
                          unoptimized
                          onClick={() => setSelectedImage(imageUrl)}
                        />
                        
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(imageUrl, msg.id);
                            }}
                            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 m-1"
                          >
                            <FiDownload className="text-gray-700" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(imageUrl);
                            }}
                            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 m-1"
                          >
                            <FiMaximize className="text-gray-700" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-100 text-gray-500 text-center aspect-square flex items-center justify-center">
                        No image data
                      </div>
                    )}
                    
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-gray-800 truncate">
                          {msg.topic.split('/').pop() || 'unknown'}
                        </h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                      
                      {!imageUrl && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {msg.payload.length > 100 
                            ? `${msg.payload.substring(0, 100)}...` 
                            : msg.payload}
                        </p>
                      )}
                    </div>
                    
                    {msg.isNew && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        New
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full max-h-[80vh]">
                <Image
                  src={selectedImage}
                  alt="Enlarged MQTT Image"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => downloadImage(selectedImage)}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                >
                  <FiDownload className="text-gray-700" />
                </button>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}