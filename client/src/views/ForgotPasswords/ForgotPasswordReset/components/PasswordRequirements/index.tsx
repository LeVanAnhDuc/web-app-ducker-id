const PasswordRequirements = ({
  labels
}: {
  labels: {
    title: string;
    minLength: string;
    uppercase: string;
    number: string;
    specialChar: string;
  };
}) => (
  <div className="bg-cream rounded-lg p-4">
    <p className="text-cream-foreground mb-2 text-sm">{labels.title}</p>
    <ul className="text-cream-foreground/80 list-inside list-disc space-y-1 text-sm">
      <li>{labels.minLength}</li>
      <li>{labels.uppercase}</li>
      <li>{labels.number}</li>
      <li>{labels.specialChar}</li>
    </ul>
  </div>
);

export default PasswordRequirements;
