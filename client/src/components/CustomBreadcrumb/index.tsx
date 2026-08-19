// libs
import { Fragment } from "react";
// types
import type { CustomBreadcrumbItem } from "@/types/CustomBreadcrumb";
// components
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
// others
import { Link } from "@/i18n/navigation";

const CustomBreadcrumb = ({
  items,
  className
}: {
  items: readonly CustomBreadcrumbItem[];
  className?: string;
}) => (
  <Breadcrumb className={className}>
    <BreadcrumbList>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={item.key}>
            <BreadcrumbItem>
              {isLast || !item.href ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!isLast && <BreadcrumbSeparator />}
          </Fragment>
        );
      })}
    </BreadcrumbList>
  </Breadcrumb>
);

export default CustomBreadcrumb;
