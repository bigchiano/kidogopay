import QRCode from "qrcode";

export async function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#141842", light: "#ffffff" },
  });
  return (
    <div
      role="img"
      aria-label="QR code of the address"
      className="rounded-xl bg-white p-3 [&_svg]:h-full [&_svg]:w-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
