export interface WhatsAppMessagePayload {
  to: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[]; // variables like {{1}}, {{2}} in the template
}

export const sendWhatsAppMessage = async (payload: WhatsAppMessagePayload) => {
  try {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp API Error:", errorData);
      throw new Error(errorData.error || 'Failed to send WhatsApp message');
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
};
