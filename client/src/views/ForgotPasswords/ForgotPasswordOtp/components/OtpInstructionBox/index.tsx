const OtpInstructionBox = ({ instruction }: { instruction: string }) => (
  <div className="bg-cream rounded-lg p-4">
    <p className="text-cream-foreground text-center text-sm">{instruction}</p>
  </div>
);

export default OtpInstructionBox;
