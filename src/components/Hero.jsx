"use client";

import Image from "next/image";
import heroImage from "../public/hero-image.jpg";
const Hero = () => {
  return (
    <div className="container mx-auto min-h-[70vh] px-4 py-12">
      <div className="flex flex-col items-center gap-8 md:flex-row">
        <div className="text-center md:w-1/2">
          <h1 className="text-4xl font-bold">
            Connecting the{" "}
            <span className="rounded-md bg-black px-2 py-1 text-white">
              mqttLink
            </span>
          </h1>
          <h1 className="text-4xl font-bold">IoT Lab Studies at Karelia UAS</h1>
          <p className="mt-3 text-lg leading-relaxed">
            Join the premier platform for mqttLink
            <br />
            Student and IoT Lab
          </p>
          <div className="mt-10 space-x-4">
            <a
              href="/gauge"
              className="rounded-lg bg-yellow-500 px-6 py-3 font-medium text-black hover:bg-yellow-600"
            >
              Gauge Temperature
            </a>
            <a
              href="/livechart"
              className="rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
            >
              Line Chart
            </a>
          </div>
        </div>

        <div className="relative h-[400px] w-full overflow-hidden rounded-lg shadow-lg md:w-1/2">
          <Image
            src={heroImage}
            alt="mqttLink IoT Lab Studies at Karelia UAS illustration"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
};

export default Hero;
