import QRCode from "qrcode";

export async function showQr(url: string): Promise<void> {
  console.log(await QRCode.toString(url, { type: "terminal", small: true }));
}
