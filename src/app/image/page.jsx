'use client';
import { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';
import Image from 'next/image';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [activeFilter, setActiveFilter] = useState('all');
  const newMessageIds = useRef(new Set());

  // Filter messages to only show image-related topics
  const filteredMessages = messages.filter(msg => {
    if (activeFilter === 'all') return true;
    return msg.topic.includes(activeFilter);
  });

  useEffect(() => {
    const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_URL, {
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      reconnectPeriod: 5000, // Auto-reconnect every 5 seconds
    });

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('connected');
      client.subscribe('image/#'); // Only subscribe to image topics
      client.subscribe('image/process/result');
      client.subscribe('image/processed');
    });

    client.on('message', (topic, payload) => {
      try {
        const payloadStr = payload.toString();
        const message = {
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          topic,
          payload: payloadStr,
          timestamp: new Date().toLocaleTimeString(),
          isNew: true,
          isImage: topic.includes('image') && isBase64Image(payloadStr)
        };

        setMessages(prev => [message, ...prev.slice(0, 49)]); // Keep latest 50
        newMessageIds.current.add(message.id);

        // Remove "new" indicator after 3 seconds
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
    });

    client.on('close', () => {
      setConnectionStatus('disconnected');
    });

    return () => {
      client.end();
    };
  }, []);

  function isBase64Image(str) {
    try {
      const json = JSON.parse(str);
      return json.imageData && json.imageData.startsWith('/9j/') || 
             json.imageData.startsWith('iVBORw0KGgo');
    } catch {
      return false;
    }
  }

  function extractImageData(payload) {
    try {
      const data = JSON.parse(payload);
      return data.imageData ? `data:image/jpeg;base64,${data.imageData}` : null;
    } catch {
      return null;
    }
  }

  function getConnectionStatusColor() {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Real-Time Image Dashboard</h1>
            <p className="text-gray-600 mt-1">Subscribe to MQTT image topics</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`h-3 w-3 rounded-full ${getConnectionStatusColor()}`}></div>
            <span className="text-sm font-medium capitalize">
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus}
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'processed', 'result', 'raw'].map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {filter === 'all' ? 'All Images' : `image/${filter}`}
            </button>
          ))}
        </div>

        {/* Messages Grid */}
        {filteredMessages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">No images received yet. Waiting for MQTT messages...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMessages.map((msg) => {
              const imageUrl = extractImageData(msg.payload);
              
              return (
                <div
                  key={msg.id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${
                    msg.isNew ? 'ring-2 ring-blue-500 scale-[1.02]' : ''
                  } hover:shadow-md`}
                >
                  {imageUrl ? (
                    <div className="relative aspect-square bg-gray-100">
                      <Image
                        src={imageUrl}
                        alt={`MQTT Image ${msg.timestamp}`}
                        fill
                        className="object-contain"
                        unoptimized // Required for base64 images
                      />
                      {msg.isNew && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                          New
                        </div>
                      )}
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
                        {msg.timestamp}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}