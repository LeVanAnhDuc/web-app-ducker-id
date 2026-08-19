// libs
import { useController } from "react-hook-form";
// types
import type { FieldPath, FieldValues } from "react-hook-form";

// Cú pháp: <T extends BaseType = DefaultType>
// - T: tên của generic type parameter
// - extends BaseType: T phải thừa kế/tương thích với BaseType
// - = DefaultType: giá trị mặc định nếu không truyền T

const useFieldProps = <TFieldValues extends FieldValues = FieldValues>(
  propsOrFieldName: FieldPath<TFieldValues>
) => {
  const { field, fieldState, formState } = useController({
    name: propsOrFieldName
  });

  return { field: { id: field.name, ...field }, fieldState, formState };
};

export default useFieldProps;
