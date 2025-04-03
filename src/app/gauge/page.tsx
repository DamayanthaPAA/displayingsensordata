'use client';
import { useEffect, useState } from 'react';
import mqtt from 'mqtt';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function MqttTemperatureGauge() {
  const [temperature, setTemperature] = useState(0);

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
        const value = parseFloat(parsed.value);

        if (!isNaN(value)) {
          setTemperature(value);
        }
      } catch (err) {
        console.error('Invalid JSON payload:', err);
      }
    });

    return () => {
      client.end();
    };
  }, []);

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'radialBar',
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        dataLabels: {
          name: {
            fontSize: '16px',
            color: '#888',
            offsetY: 80,
          },
          value: {
            offsetY: 30,
            fontSize: '22px',
            formatter: (val) => `${val} °C`,
          },
        },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        gradientToColors: ['#ABE5A1'],
        stops: [0, 100],
      },
    },
    stroke: {
      lineCap: 'round',
    },
    labels: ['Temperature'],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">MQTT Temperature Gauge</h1>

      <Chart
        options={chartOptions}
        series={[temperature]}
        type="radialBar"
        height={350}
      />

      <div className="mt-4 text-xl">
        Current Temperature: <strong>{temperature.toFixed(2)} °C</strong>
      </div>
    </div>
  );
}
