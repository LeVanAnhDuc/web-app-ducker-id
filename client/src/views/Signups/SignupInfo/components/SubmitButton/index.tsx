// components
import CustomButton from "@/components/CustomButton";

const SubmitButton = ({
  label,
  loading = false,
  fullWidth = true
}: {
  label: string;
  loading?: boolean;
  fullWidth?: boolean;
}) => (
  <CustomButton type="submit" loading={loading} fullWidth={fullWidth}>
    {label}
  </CustomButton>
);

export default SubmitButton;
