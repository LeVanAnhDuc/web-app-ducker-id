"use client";

// libs
import { useEffect, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
// types
import type { Locale } from "date-fns";
// components
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

const CustomDateInput = ({
  value,
  onChange,
  dateLocale,
  minDate,
  maxDate,
  label,
  placeholder,
  disabled = false,
  required = false,
  error = false,
  displayFormat = "dd/MM/yyyy"
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  dateLocale: Locale;
  minDate: Date;
  maxDate: Date;
  label: string;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  displayFormat?: Parameters<typeof format>[1];
}) => {
  const t = useTranslations("common.dateInput");
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    value ? format(value, displayFormat) : ""
  );
  const [month, setMonth] = useState<Date | undefined>(value);

  useEffect(() => {
    if (!value) {
      setInputValue("");
      return;
    }
    setInputValue(format(value, displayFormat));
    setMonth(value);
  }, [value, displayFormat]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInputValue(text);

    if (!text) {
      onChange(undefined);
      return;
    }

    const parsed = parse(text, displayFormat, new Date());
    if (isValid(parsed) && parsed >= minDate && parsed <= maxDate) {
      onChange(parsed);
      setMonth(parsed);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setInputValue(date ? format(date, displayFormat) : "");
    if (date) setMonth(date);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <CustomInput
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error}
          className="pr-11"
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <CustomButton
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label={t("openCalendar")}
              className="absolute top-1/2 right-1.5 -translate-y-1/2"
            >
              <CalendarIcon className="size-4 opacity-60" />
            </CustomButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={value}
              month={month}
              onMonthChange={setMonth}
              onSelect={handleCalendarSelect}
              disabled={(date) => date > maxDate || date < minDate}
              defaultMonth={value || new Date(2000, 0)}
              captionLayout="dropdown"
              fromYear={minDate.getFullYear()}
              toYear={maxDate.getFullYear()}
              locale={dateLocale}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default CustomDateInput;
