/**
 * Screenshot helpers for "Report a problem". Two ways to attach an image — capture
 * the screen (the user chooses what to share and previews it before sending) or
 * upload one — both downscaled and JPEG-compressed to fit comfortably under the
 * backend's size cap (and Firestore's 1 MiB document limit). Everything happens
 * locally in the browser; nothing is sent until the reporter submits.
 */

const MAX_DIMENSION = 1280;
/** Target encoded size. Server accepts up to ~900 KB; we aim lower for headroom. */
export const SCREENSHOT_TARGET_BYTES = 650_000;
export const SCREENSHOT_MAX_BYTES = 880_000;

/** Approximate decoded byte size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
	const comma = dataUrl.indexOf(",");
	const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
	return Math.floor((b64.length * 3) / 4);
}

/** Draw a source onto a downscaled canvas and encode as JPEG, lowering quality
 *  (then dimensions) until it fits under `maxBytes` — best effort at the floor. */
async function encodeFitted(source: CanvasImageSource, srcW: number, srcH: number, maxBytes: number): Promise<string> {
	const fit = Math.min(1, MAX_DIMENSION / Math.max(srcW || 1, srcH || 1));
	let w = Math.max(1, Math.round((srcW || MAX_DIMENSION) * fit));
	let h = Math.max(1, Math.round((srcH || MAX_DIMENSION) * fit));
	let quality = 0.75;
	let out = "";

	for (let attempt = 0; attempt < 7; attempt++) {
		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Couldn't process the image in this browser.");
		ctx.drawImage(source, 0, 0, w, h);
		out = canvas.toDataURL("image/jpeg", quality);
		if (dataUrlBytes(out) <= maxBytes) return out;
		if (quality > 0.45) quality -= 0.12;
		else {
			w = Math.max(1, Math.round(w * 0.85));
			h = Math.max(1, Math.round(h * 0.85));
		}
	}
	return out;
}

/** Capture the screen via the browser's picker. Throws if unsupported or denied. */
export async function captureScreen(maxBytes = SCREENSHOT_TARGET_BYTES): Promise<string> {
	const media = navigator.mediaDevices;
	if (!media || typeof media.getDisplayMedia !== "function") {
		throw new Error("Screen capture isn't available here — you can upload an image instead.");
	}
	const stream = await media.getDisplayMedia({ video: { frameRate: 1 }, audio: false });
	try {
		const video = document.createElement("video");
		video.srcObject = stream;
		video.muted = true;
		await video.play().catch(() => {
			/* some browsers resolve play() late; the wait below covers it */
		});
		await new Promise<void>((resolve) => {
			if (video.readyState >= 2 && video.videoWidth) return resolve();
			video.onloadeddata = () => resolve();
			setTimeout(resolve, 900);
		});
		return await encodeFitted(video, video.videoWidth || MAX_DIMENSION, video.videoHeight || 720, maxBytes);
	} finally {
		stream.getTracks().forEach((t) => t.stop());
	}
}

/** Compress an uploaded image file to a fitted JPEG data URL. */
export async function imageFileToDataUrl(file: File, maxBytes = SCREENSHOT_TARGET_BYTES): Promise<string> {
	if (!file.type.startsWith("image/")) {
		throw new Error("Please choose an image file.");
	}
	const url = URL.createObjectURL(file);
	try {
		const img = new Image();
		img.src = url;
		await img.decode();
		return await encodeFitted(img, img.naturalWidth, img.naturalHeight, maxBytes);
	} finally {
		URL.revokeObjectURL(url);
	}
}
