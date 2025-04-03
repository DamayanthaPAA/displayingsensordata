'use client';
import { useEffect, useState } from 'react';
import mqtt from 'mqtt';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function MqttChartDashboard() {
  const [chartData, setChartData] = useState([]);
  const [latestTemp, setLatestTemp] = useState(null);
  const [latestTimestamp, setLatestTimestamp] = useState(null);

  useEffect(() => {
    const client = mqtt.connect('wss://5f5ba371ec6448c0b2fbc4399ec24cd5.s1.eu.hivemq.cloud:8884/mqtt', {
      username: 'admin',
      password: 'IoT@1234567890',
    });

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      client.subscribe('/karelia/wartsila/026a/sensor/temperature');
    });

    client.on('message', (topic, payload) => {
      try {
        const parsed = JSON.parse(payload.toString());
        const timestamp = new Date(parsed.timestamp);
        const value = parseFloat(parsed.value);

        if (!isNaN(value)) {
          const newPoint = {
            x: timestamp.getTime(),
            y: value,
          };
          setChartData((prev) => [...prev.slice(-19), newPoint]);
          setLatestTemp(value);
          setLatestTimestamp(timestamp.toLocaleTimeString());
        }
      } catch (err) {
        console.error('Invalid JSON payload:', err);
      }
    });

    return () => {
      client.end();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-6">Live Temperature Chart</h1>

      {latestTemp !== null && latestTimestamp && (
        <div className="mb-4 p-4 bg-white rounded shadow">
          <h2 className="text-xl font-semibold">Current Temperature: {latestTemp} °C</h2>
          <p className="text-gray-600">Updated at: {latestTimestamp}</p>
        </div>
      )}

      {chartData.length > 0 ? (
        <Chart
          type="line"
          height={350}
          options={{
            chart: {
              id: 'temperature-chart',
              animations: {
                enabled: true,
                dynamicAnimation: { speed: 1000 },
              },
            },
            xaxis: {
              type: 'datetime',
              title: { text: 'Time of Day' },
              labels: {
                datetimeFormatter: {
                  hour: 'HH:mm:ss',
                },
              },
            },
            yaxis: {
              title: { text: 'Temperature (°C)' },
            },
            tooltip: {
              x: {
                format: 'HH:mm:ss',
              },
            },
          }}
          series={[{ name: 'Temperature', data: chartData }]}
        />
      ) : (
        <p className="text-gray-600">Waiting for temperature data...</p>
      )}
    </div>
  );
}
