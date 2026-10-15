import { checkFolder, createPhoto, driveDeps, listDevicePhotos, trashFile } from '../lib/drive/files';

async function main() {
  const deps = driveDeps();
  const signal = () => AbortSignal.timeout(15_000);
  const photoId = crypto.randomUUID();
  const deviceId = crypto.randomUUID();

  console.log('1/4 Checking folder access…');
  await checkFolder(deps, signal());

  console.log('2/4 Uploading a test file…');
  const { id } = await createPhoto(
    deps,
    {
      name: `VERIFY_${photoId}.jpg`,
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      appProperties: { app: 'nf26-candid-cam-verify', photoId, deviceId },
    },
    signal(),
  );

  console.log('3/4 Finding it by device ID…');
  const found = await listDevicePhotos(deps, deviceId, signal());
  if (!found.includes(photoId)) throw new Error('Uploaded file was not found by the device ID search');

  console.log('4/4 Moving the test file to trash…');
  await trashFile(deps, id, signal());

  console.log('Drive OK: upload, search and trash all work.');
}

main().catch((e: unknown) => {
  console.error('Drive check FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
