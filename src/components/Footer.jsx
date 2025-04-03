export default function Footer() {
    return (
      <footer className="bg-green-900 text-white text-center py-6 mt-8">
        <p>&copy; {new Date().getFullYear()} mqttLink. All rights reserved.</p>
      </footer>
    );
  }