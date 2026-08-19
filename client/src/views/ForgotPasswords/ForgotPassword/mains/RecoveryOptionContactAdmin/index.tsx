"use client";

// libs
import { useState } from "react";
import { Headset } from "lucide-react";
// components
import RecoveryOptionCard from "../../components/RecoveryOptionCard";
import CustomButton from "@/components/CustomButton";
import SupportDialog from "@/components/SupportDialog";
import { FadeSlideLeft } from "@/components/Animated";
// others
import { cn } from "@/libs/utils";

const RecoveryOptionContactAdmin = ({
  email,
  title,
  description,
  delay
}: {
  email: string;
  title: string;
  description: string;
  delay?: number;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FadeSlideLeft delay={delay}>
        <CustomButton
          variant="ghost"
          fullWidth
          onClick={() => setOpen(true)}
          className={cn(
            "group flex h-auto items-center justify-start gap-4",
            "border-border rounded-xl border-2 px-4 py-4",
            "text-left whitespace-normal",
            "transition-colors duration-200",
            "hover:border-primary hover:bg-primary/5"
          )}
        >
          <RecoveryOptionCard
            icon={Headset}
            title={title}
            description={description}
            colorVariant="info"
          />
        </CustomButton>
      </FadeSlideLeft>
      <SupportDialog open={open} onOpenChange={setOpen} initialEmail={email} />
    </>
  );
};

export default RecoveryOptionContactAdmin;
