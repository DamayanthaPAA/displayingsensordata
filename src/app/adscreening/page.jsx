'use client';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { FiWifi, FiWifiOff, FiRefreshCw, FiUsers, FiVideo, FiDownload, FiMaximize } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function WebSocketStreamDashboard() {
  const [clientStreams, setClientStreams] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [activeClients, setActiveClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const wsRef = useRef(null);
  const animationTimeoutRef = useRef({});
  const reconnectAttemptRef = useRef(0);

  const connectWebSocket = () => {
    // Replace with your WebSocket endpoint that connects to MQTT
    const wsUrl = process.env.NEXT_PUBLIC_WS_MQTT_URL || 'ws://localhost:9001/mqtt';
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      setIsLoading(false);
      reconnectAttemptRef.current = 0;
      
      // Subscribe to topics through WebSocket
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        topics: ['image/processed', 'image/process/result']
      }));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.topic && data.payload) {
          const payload = JSON.parse(data.payload);
          
          if (payload.imageData && payload.metadata?.clientId) {
            const clientId = payload.metadata.clientId;
            const imageUrl = `data:image/${payload.metadata?.format || 'jpeg'};base64,${payload.imageData}`;
            
            const newImage = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              url: imageUrl,
              timestamp: new Date(),
              topic: data.topic,
              metadata: payload.metadata,
              isNew: true
            };

            // Clear any existing animation timeout for this client
            if (animationTimeoutRef.current[clientId]) {
              clearTimeout(animationTimeoutRef.current[clientId]);
            }

            // Update the streams
            const updatedStreams = {
              ...clientStreams,
              [clientId]: [...(clientStreams[clientId] || []).slice(-14), newImage] // Keep last 15 images
            };
            
            setClientStreams(updatedStreams);
            
            // Set timeout to remove "new" animation
            animationTimeoutRef.current[clientId] = setTimeout(() => {
              setClientStreams(prev => ({
                ...prev,
                [clientId]: (prev[clientId] || []).map(img => 
                  img.id === newImage.id ? { ...img, isNew: false } : img
                )
              }));
            }, 2000);

            // Update active clients list if new client
            if (!activeClients.includes(clientId)) {
              setActiveClients(prev => [...prev, clientId]);
            }
          }
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
      setIsLoading(false);
    };

    wsRef.current.onclose = () => {
      setConnectionStatus('disconnected');
      // Attempt reconnection with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
      setTimeout(() => {
        reconnectAttemptRef.current += 1;
        connectWebSocket();
      }, delay);
    };
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      // Cleanup WebSocket connection
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      // Clear all animation timeouts
      Object.values(animationTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  function getConnectionIcon() {
    switch (connectionStatus) {
      case 'connected': return <FiWifi className="text-green-500" />;
      case 'error': return <FiWifiOff className="text-red-500" />;
      default: return <FiRefreshCw className="text-yellow-500 animate-spin" />;
    }
  }

  function formatTimestamp(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function downloadImage(imageUrl, clientId, timestamp) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `stream-${clientId}-${timestamp.getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <FiVideo className="text-blue-400" />
              WebSocket MQTT Stream Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Real-time client video streams via WebSocket</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
              {getConnectionIcon()}
              <span className="text-sm font-medium capitalize">
                {connectionStatus === 'connected' ? 'Live' : connectionStatus}
                {connectionStatus === 'connecting' && ` (attempt ${reconnectAttemptRef.current + 1})`}
              </span>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
              <FiUsers className="text-blue-400" />
              <span className="text-sm font-medium">
                {activeClients.length} Active Clients
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <div className="h-10 w-10 bg-blue-400 rounded-full opacity-70"></div>
              <p className="text-gray-400">Connecting to WebSocket...</p>
            </div>
          </div>
        ) : activeClients.length === 0 ? (
          <div className="bg-gray-800 rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-400">
              {connectionStatus === 'connected' 
                ? "Waiting for client streams..." 
                : "Cannot receive streams while disconnected"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeClients.map(clientId => {
              const clientImages = clientStreams[clientId] || [];
              const latestImage = clientImages[clientImages.length - 1];
              
              return (
                <motion.div
                  key={clientId}
                  layout
                  className="bg-gray-800 rounded-xl shadow-lg overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="font-medium text-lg">
                      Client: <span className="text-blue-400">{clientId}</span>
                    </h2>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      {clientImages.length} frames
                    </span>
                  </div>
                  
                  {/* Video stream display */}
                  <div className="relative aspect-video bg-black">
                    {latestImage ? (
                      <>
                        <motion.div
                          key={latestImage.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0"
                        >
                          <Image
                            src={latestImage.url}
                            alt={`Stream from ${clientId}`}
                            fill
                            className="object-contain"
                            unoptimized
                            onClick={() => setSelectedImage(latestImage)}
                          />
                        </motion.div>
                        
                        {/* Timestamp overlay */}
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          {formatTimestamp(latestImage.timestamp)}
                        </div>
                        
                        {/* Action buttons */}
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(latestImage.url, clientId, latestImage.timestamp);
                            }}
                            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                            title="Download this frame"
                          >
                            <FiDownload className="text-gray-300" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(latestImage);
                            }}
                            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                            title="View full screen"
                          >
                            <FiMaximize className="text-gray-300" />
                          </button>
                        </div>
                        
                        {/* New frame indicator */}
                        {latestImage.isNew && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                            New Frame
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Waiting for frames...
                      </div>
                    )}
                  </div>
                  
                  {/* Thumbnail timeline */}
                  <div className="p-3 bg-gray-900 overflow-x-auto">
                    <div className="flex gap-2">
                      <AnimatePresence>
                        {clientImages.map((img, idx) => (
                          <motion.div
                            key={img.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className="relative h-16 w-24 flex-shrink-0 cursor-pointer"
                            onClick={() => {
                              // Bring this frame to the front
                              setClientStreams(prev => ({
                                ...prev,
                                [clientId]: [
                                  ...prev[clientId].slice(0, idx),
                                  ...prev[clientId].slice(idx + 1),
                                  { ...img, isNew: true }
                                ]
                              }));
                            }}
                          >
                            <Image
                              src={img.url}
                              alt={`Thumbnail ${idx + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            {idx === clientImages.length - 1 && (
                              <div className="absolute inset-0 border-2 border-blue-400"></div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-6xl w-full max-h-[90vh] bg-gray-900 rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full max-h-[80vh]">
                <Image
                  src={selectedImage.url}
                  alt="Enlarged MQTT Image"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => downloadImage(selectedImage.url, selectedImage.metadata?.clientId || 'client', selectedImage.timestamp)}
                  className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                  title="Download"
                >
                  <FiDownload className="text-gray-300" />
                </button>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                  title="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white text-sm px-3 py-2 rounded">
                <div>Client: {selectedImage.metadata?.clientId || 'unknown'}</div>
                <div>Time: {formatTimestamp(selectedImage.timestamp)}</div>
                {selectedImage.metadata?.variant && (
                  <div>Variant: {selectedImage.metadata.variant}</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}