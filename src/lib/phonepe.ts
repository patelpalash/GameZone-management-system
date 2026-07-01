export async function getPhonePeToken(): Promise<string> {
  const baseUrl = process.env.PHONEPE_BASE_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
  const tokenUrl = `${baseUrl}/v1/oauth/token`;
  const clientId = process.env.PHONEPE_CLIENT_ID || "";
  const clientVersion = process.env.PHONEPE_CLIENT_VERSION || "1";
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET || "";

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_version", clientVersion);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.access_token) {
    return data.access_token;
  } else {
    throw new Error(
      data.error_description || data.error || "Failed to fetch PhonePe OAuth token"
    );
  }
}
