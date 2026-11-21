// libs
import { useController } from "react-hook-form";
// types
import type { FieldPath, FieldValues } from "react-hook-form";

const useFieldProps = <TFieldValues extends FieldValues = FieldValues>(
  propsOrFieldName: FieldPath<TFieldValues>
) => {
  const { field, fieldState, formState } = useController({
    name: propsOrFieldName
  });

  return { field: { id: field.name, ...field }, fieldState, formState };
};

export default useFieldProps;
