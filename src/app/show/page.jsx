'use client';
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import mqtt from 'mqtt';
import Image from 'next/image';
import { FiDownload, FiMaximize2, FiWifi, FiWifiOff, FiRefreshCw } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

function ImageCard({ image, onPreview, onDownload }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl shadow overflow-hidden"
    >
      <div className="relative aspect-video bg-gray-100 group">
        <Image
          src={image.url}
          alt={`Image ${image.imageId}`}
          fill
          className="object-contain"
          unoptimized
          onClick={() => onPreview(image.url)}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(image.url, image.imageId);
            }}
            className="p-2 bg-white rounded-full m-2 hover:bg-gray-100"
          >
            <FiDownload className="text-gray-700" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(image.url);
            }}
            className="p-2 bg-white rounded-full m-2 hover:bg-gray-100"
          >
            <FiMaximize2 className="text-gray-700" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-700">
          <strong>Topic:</strong> {image.topic}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Variant:</strong> {image.variant}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(image.timestamp).toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}

ImageCard.propTypes = {
  image: PropTypes.shape({
    imageId: PropTypes.string.isRequired,
    topic: PropTypes.string.isRequired,
    variant: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
  }).isRequired,
  onPreview: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

export default function ShowPage() {
  const [latestImage, setLatestImage] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_URL, {
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      reconnectPeriod: 2000,
    });

    client.on('connect', () => {
      console.log('✅ MQTT Connected');
      setStatus('connected');
      client.subscribe('image/#');
    });

    client.on('message', (topic, payload) => {
      try {
        const json = JSON.parse(payload.toString());
        if (json?.imageData) {
          const format = json.metadata?.format || 'jpeg';
          const img = {
            imageId: json.metadata?.processedImageId || json.imageId || 'unknown',
            topic,
            variant: json.metadata?.variant || 'processed',
            timestamp: json.timestamp || new Date().toISOString(),
            url: `data:image/${format};base64,${json.imageData}`,
          };
          setLatestImage(img);
        }
      } catch (err) {
        console.error('⚠️ Failed to parse image payload', err);
      }
    });

    client.on('error', (err) => {
      console.error('MQTT Error:', err.message);
      setStatus('error');
    });

    client.on('close', () => {
      console.log('🔌 Disconnected from broker');
      setStatus('disconnected');
    });

    return () => client.end();
  }, []);

  const getConnectionIcon = () => {
    switch (status) {
      case 'connected': return <FiWifi className="text-green-500" />;
      case 'error': return <FiWifiOff className="text-red-500" />;
      default: return <FiRefreshCw className="text-yellow-500 animate-spin" />;
    }
  };

  const downloadImage = (url, name = 'mqtt-image.jpg') => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📷 MQTT Image Viewer</h1>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
            {getConnectionIcon()}
            <span className="text-sm capitalize">{status}</span>
          </div>
        </div>

        {latestImage ? (
          <ImageCard
            image={latestImage}
            onPreview={(url) => setPreviewImage(url)}
            onDownload={downloadImage}
          />
        ) : (
          <div className="bg-white p-8 rounded-lg text-center text-gray-500 shadow">
            {status === 'connected'
              ? 'Waiting for image...'
              : 'Connecting to broker...'}
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-5xl w-full h-[80vh] bg-white rounded-lg overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full">
                <Image
                  src={previewImage}
                  alt="Preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => downloadImage(previewImage)}
                  className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                >
                  <FiDownload className="text-gray-700" />
                </button>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
