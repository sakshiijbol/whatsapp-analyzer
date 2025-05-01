import React, { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'chart.js/auto';

function App() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const analyzeChat = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');

      let sent = 0;
      let received = 0;
      const hours = Array(24).fill(0);
      const days = Array(7).fill(0);
      const contacts = {};
      const replyTimes = [];
      let lastMessage = null;

      lines.forEach((line) => {
        const match = line.match(/^\[(\d+\/\d+\/\d+), (\d+:\d+ [AP]M)\] (.+?): (.+)/);
        if (match) {
          const [_, date, time, sender, message] = match;
          const isYou = sender.toLowerCase().includes('you');
          const timestamp = new Date(`${date}, ${time}`.replace(/(\d+)\/(\d+)\/(\d+)/, '$2/$1/$3'));

          // Track active hours/days
          const hour = timestamp.getHours();
          const day = timestamp.getDay();
          hours[hour]++;
          days[day]++;

          // Count sent/received
          if (isYou) {
            sent++;
          } else {
            received++;
            contacts[sender] = (contacts[sender] || 0) + 1;
          }

          // Calculate reply time (if previous message was from someone else)
          if (lastMessage && lastMessage.isYou !== isYou) {
            const replyTime = (timestamp - lastMessage.timestamp) / (1000 * 60); // in minutes
            replyTimes.push(replyTime);
          }

          lastMessage = { isYou, timestamp };
        }
      });

      // Calculate average reply time (in minutes)
      const avgReplyTime = replyTimes.length > 0 
        ? (replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length).toFixed(1)
        : 'N/A';

      // Sort top contacts
      const topContacts = Object.entries(contacts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      setStats({
        sent,
        received,
        hours,
        days,
        topContacts,
        avgReplyTime,
        replyTimes,
      });
    };
    reader.readAsText(file);
  };

  const generatePDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    doc.text("WhatsApp Chat Report", 10, 10);
    doc.text(`Messages Sent: ${stats.sent}`, 10, 20);
    doc.text(`Messages Received: ${stats.received}`, 10, 30);
    doc.text(`Avg Reply Time: ${stats.avgReplyTime} mins`, 10, 40);
    doc.text("Top Contacts:", 10, 50);
    stats.topContacts.forEach(([name, count], i) => {
      doc.text(`${i + 1}. ${name}: ${count} messages`, 10, 60 + i * 10);
    });
    doc.save("whatsapp_report.pdf");
  };

  // Chart data
  const hourData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Messages per Hour',
      data: stats?.hours || [],
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
    }],
  };

  const replyTimeData = {
    labels: stats?.replyTimes.map((_, i) => `Reply ${i + 1}`) || [],
    datasets: [{
      label: 'Reply Time (mins)',
      data: stats?.replyTimes || [],
      borderColor: 'rgba(255, 99, 132, 1)',
      fill: false,
    }],
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>WhatsApp Chat Analyzer</h1>
      <input
        type="file"
        accept=".txt"
        onChange={(e) => analyzeChat(e.target.files[0])}
        style={{ margin: '10px 0' }}
      />
      
      {stats && (
        <div>
          <h2>Report</h2>
          <p>📤 Sent: <strong>{stats.sent}</strong></p>
          <p>📥 Received: <strong>{stats.received}</strong></p>
          <p>⏱️ Avg Reply Time: <strong>{stats.avgReplyTime} mins</strong></p>
          
          <h3>Top Contacts</h3>
          <ul>
            {stats.topContacts.map(([name, count], i) => (
              <li key={i}>{name}: {count} messages</li>
            ))}
          </ul>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ width: '45%' }}>
              <h3>Active Hours</h3>
              <Bar data={hourData} />
            </div>
            <div style={{ width: '45%' }}>
              <h3>Reply Times (mins)</h3>
              <Line data={replyTimeData} />
            </div>
          </div>
          
          <button onClick={generatePDF} style={{ marginTop: '20px', padding: '10px' }}>
            Download PDF Report
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
