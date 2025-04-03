export default function Features() {
    return (
      <section id="features" className="bg-gray-100 py-12 text-center">
        <h2 className="text-3xl font-bold mb-6">Features</h2>
        <div className="flex justify-around flex-wrap max-w-4xl mx-auto">
          <div className="w-64 p-4">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="font-semibold text-xl">Real-Time Data</h3>
            <p className="text-gray-600">Monitor and display sensor data live with MQTT integration.</p>
          </div>
          <div className="w-64 p-4">
            <div className="text-4xl mb-2">🧪</div>
            <h3 className="font-semibold text-xl">Interactive Labs</h3>
            <p className="text-gray-600">Experiment and explore with interactive IoT lab simulations.</p>
          </div>
          <div className="w-64 p-4">
            <div className="text-4xl mb-2">📚</div>
            <h3 className="font-semibold text-xl">Learning Hub</h3>
            <p className="text-gray-600">Access resources and guides to enhance your knowledge.</p>
          </div>
        </div>
      </section>
    );
  }