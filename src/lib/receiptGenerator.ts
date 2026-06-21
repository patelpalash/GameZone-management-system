import { Booking, Station } from "@/types";

export function downloadReceipt(booking: Booking, station?: Station) {
  const formattedStart = booking.startTime || booking.scheduledStartTime 
    ? (booking.startTime || booking.scheduledStartTime)!.toDate().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : "—";

  const formattedEnd = booking.endTime || booking.scheduledEndTime 
    ? (booking.endTime || booking.scheduledEndTime)!.toDate().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : "—";

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>GAMEZONE Receipt - ${booking.transactionId || booking.id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        body {
          font-family: 'Share Tech Mono', 'Courier New', Courier, monospace;
          color: #000;
          background: #fff;
          width: 80mm;
          margin: 0 auto;
          padding: 10px;
          box-sizing: border-box;
          font-size: 12px;
          line-height: 1.4;
        }
        .header {
          text-align: center;
          margin-bottom: 15px;
          text-transform: uppercase;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 1px;
          margin: 0;
        }
        .subtitle {
          font-size: 10px;
          margin: 2px 0 0 0;
          color: #555;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .double-divider {
          border-top: 3px double #000;
          margin: 8px 0;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
        }
        .info-label {
          font-weight: normal;
        }
        .info-value {
          text-align: right;
          font-weight: bold;
        }
        .total-section {
          font-size: 14px;
          font-weight: bold;
          margin-top: 8px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 9px;
          color: #333;
        }
        .barcode {
          font-family: 'Courier New', monospace;
          letter-spacing: 6px;
          text-align: center;
          font-size: 10px;
          margin: 15px 0 5px 0;
          font-weight: bold;
        }
        .cyber-badge {
          border: 1px solid #000;
          padding: 2px 6px;
          display: inline-block;
          font-size: 10px;
          margin-top: 5px;
        }
        @media print {
          body {
            width: 100%;
            padding: 0;
            margin: 0;
          }
          @page {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">/// GAMEZONE ///</div>
        <div class="subtitle">Cyber-Grid Access Terminal</div>
        <div class="subtitle">Receipt / Gate Pass</div>
      </div>
      
      <div class="double-divider"></div>
      
      <div class="info-row">
        <span class="info-label">TXN REF:</span>
        <span class="info-value">${booking.transactionId || booking.id}</span>
      </div>
      <div class="info-row">
        <span class="info-label">DATE/TIME:</span>
        <span class="info-value">${new Date().toLocaleDateString("en-IN")}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="info-row">
        <span class="info-label">STATION:</span>
        <span class="info-value">${station?.name || "General Node"} (${station?.type || "N/A"})</span>
      </div>
      <div class="info-row">
        <span class="info-label">OPERATOR:</span>
        <span class="info-value">${booking.userName || "ANONYMOUS"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">GATEWAY:</span>
        <span class="info-value">${booking.paymentMethod || "N/A"}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="info-row">
        <span class="info-label">START TIME:</span>
        <span class="info-value">${formattedStart}</span>
      </div>
      <div class="info-row">
        <span class="info-label">END TIME:</span>
        <span class="info-value">${formattedEnd}</span>
      </div>
      <div class="info-row">
        <span class="info-label">DURATION:</span>
        <span class="info-value">${booking.durationMinutes} min</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="info-row">
        <span class="info-label">RATE / HR:</span>
        <span class="info-value">₹${station?.pricePerHour || 0}.00</span>
      </div>
      <div class="info-row total-section">
        <span class="info-label">TOTAL PAID:</span>
        <span class="info-value">₹${booking.totalCost}.00</span>
      </div>
      
      <div class="double-divider"></div>
      
      <div class="header">
        <div class="cyber-badge">STATUS: SECURED & RECORDED</div>
        <div class="barcode">||||| | ||| |||| | ||| |</div>
        <div style="font-size: 8px; margin-top: 5px;">Thank you for gaming in the Grid.</div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=450,height=650");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    
    // Auto-focus and print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  }
}
