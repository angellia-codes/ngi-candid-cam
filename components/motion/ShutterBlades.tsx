/** Two black blades close over the viewfinder and reopen (spec moment 2). Mount with a new key per shot. */
export function ShutterBlades() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="m-blade-top absolute inset-x-0 top-0 h-1/2 border-b border-[#2A2420] bg-black" />
      <span className="m-blade-bottom absolute inset-x-0 bottom-0 h-1/2 border-t border-[#2A2420] bg-black" />
    </span>
  );
}
