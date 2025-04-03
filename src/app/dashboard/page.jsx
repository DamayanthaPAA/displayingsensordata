'use client';
import { useEffect, useState } from 'react';
import mqtt from 'mqtt';

export default function Dashboard() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_URL, {
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
    });

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      client.subscribe('#');
    });

    client.on('message', (topic, payload) => {
      const message = {
        topic,
        payload: payload.toString(),
        timestamp: new Date().toLocaleString(),
      };
      setMessages((prev) => [message, ...prev.slice(0, 9)]); // keep only latest 10
    });

    return () => {
      client.end();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">MQTT Message Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className="bg-white shadow-md rounded-lg p-4 border-l-4 border-green-500"
          >
            <h2 className="font-semibold text-lg">Topic: <span className="text-blue-600">{msg.topic}</span></h2>
            <p className="mt-2 text-gray-700">{msg.payload}</p>
            <p className="mt-2 text-sm text-gray-500">{msg.timestamp}</p>
          </div>
        ))}
        {messages.length === 0 && <p>No messages received yet...</p>}
      </div>
    </div>
  );
}
