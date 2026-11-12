"use client";

export default function PrintButton() {
  return (
    <button className="btn-primary" onClick={() => window.print()}>
      Opslaan als PDF / printen
    </button>
  );
}
