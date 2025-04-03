'use client';
import { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';
import Image from 'next/image';
import { FiWifi, FiWifiOff, FiRefreshCw, FiUsers, FiVideo } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoStreamDashboard() {
  const [clientStreams, setClientStreams] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [activeClients, setActiveClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const streamsRef = useRef({});

  useEffect(() => {
    const connectToBroker = () => {
      const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_URL, {
        username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
        reconnectPeriod: 3000,
        clientId: `stream-client-${Math.random().toString(16).substr(2, 8)}`
      });

      client.on('connect', () => {
        console.log('Connected to MQTT broker');
        setConnectionStatus('connected');
        setIsLoading(false);
        client.subscribe('image/processed');
        client.subscribe('image/process/result');
      });

      client.on('message', (topic, payload) => {
        try {
          const payloadStr = payload.toString();
          const data = JSON.parse(payloadStr);
          
          if (data.imageData && data.metadata?.clientId) {
            const clientId = data.metadata.clientId;
            const imageUrl = `data:image/jpeg;base64,${data.imageData}`;
            
            const newImage = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              url: imageUrl,
              timestamp: new Date(),
              topic,
              metadata: data.metadata
            };

            // Update the ref first for immediate access
            streamsRef.current = {
              ...streamsRef.current,
              [clientId]: [...(streamsRef.current[clientId] || []).slice(-9), newImage] // Keep last 10 images
            };

            // Then update state
            setClientStreams(streamsRef.current);
            
            // Update active clients list if new client
            if (!activeClients.includes(clientId)) {
              setActiveClients(prev => [...prev, clientId]);
            }
          }
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
  }, [activeClients]);

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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <FiVideo className="text-blue-400" />
              MQTT Video Stream Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Real-time client video streams</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
              {getConnectionIcon()}
              <span className="text-sm font-medium capitalize">
                {connectionStatus === 'connected' ? 'Live' : connectionStatus}
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
              <p className="text-gray-400">Connecting to broker...</p>
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
                        <Image
                          src={latestImage.url}
                          alt={`Stream from ${clientId}`}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                        
                        {/* Timestamp overlay */}
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          {formatTimestamp(latestImage.timestamp)}
                        </div>
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
                      {clientImages.map((img, idx) => (
                        <motion.div
                          key={img.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="relative h-16 w-24 flex-shrink-0 cursor-pointer"
                          onClick={() => {
                            // Replace main image with clicked thumbnail
                            streamsRef.current = {
                              ...streamsRef.current,
                              [clientId]: [...clientImages.slice(0, idx), ...clientImages.slice(idx + 1), img]
                            };
                            setClientStreams(streamsRef.current);
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
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}