"use client";

// libs
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Tags } from "lucide-react";
// types
import type {
  AdminCategory,
  CategoryMoveDirection
} from "@/types/AdminCategories";
import type { CategoryName } from "@/types/Apps";
// components
import CustomButton from "@/components/CustomButton";
import CustomTable from "@/components/CustomTable";
import PageContent from "@/components/PageContainer/PageContent";
import PageHeader from "@/components/PageContainer/PageHeader";
import PageShell from "@/components/PageContainer/PageShell";
import AdminCategoriesSkeleton from "../../components/AdminCategoriesSkeleton";
import CategoryRowActions from "../../components/CategoryRowActions";
import CategoryFormSheet from "../CategoryFormSheet";
import DeleteCategoryDialog from "../DeleteCategoryDialog";
// ghosts
import MoveFocusEffect from "../../ghosts/MoveFocusEffect";
// hooks
import { useAdminCategories, useAnnounce, useLocalizedName } from "@/hooks";
import useMoveCategory from "../../hooks/useMoveCategory";
// dataSources
import { buildAdminCategoriesColumns } from "@/dataSources/AdminCategories";
// others
import { pickLocalized } from "@/utils";

const AdminCategoriesBoard = () => {
  const t = useTranslations("adminCategories");
  const tTable = useTranslations("adminCategories.table");
  const locale = useLocale();
  const localize = useLocalizedName();
  const { announce } = useAnnounce();
  const { data: categories = [], isLoading } = useAdminCategories();
  const moveMutation = useMoveCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [lastMove, setLastMove] = useState<{
    id: string;
    direction: CategoryMoveDirection;
  } | null>(null);

  const handleMove = (
    category: AdminCategory,
    direction: CategoryMoveDirection
  ) =>
    moveMutation.mutate(
      { id: category._id, direction },
      {
        onSuccess: (list) => {
          setLastMove({ id: category._id, direction });
          const position = list.findIndex((c) => c._id === category._id) + 1;
          announce(
            t("announce.moved", { name: localize(category.name), position })
          );
        }
      }
    );

  const columns = useMemo(
    () =>
      buildAdminCategoriesColumns({
        tTable,
        localize,
        otherLanguage: (name: CategoryName) =>
          pickLocalized(name, locale === "vi" ? "en" : "vi"),
        rows: categories,
        moving: moveMutation.isPending,
        onMove: handleMove
      }),
    [tTable, localize, locale, categories, moveMutation.isPending]
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const createButton = (
    <CustomButton onClick={openCreate} iconLeft={<Plus aria-hidden="true" />}>
      {t("actions.create")}
    </CustomButton>
  );

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={createButton}
      />
      <PageContent
        isLoading={isLoading}
        isEmpty={categories.length === 0}
        hasActiveFilters={false}
        skeleton={<AdminCategoriesSkeleton />}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
        emptyIcon={<Tags className="size-12" aria-hidden="true" />}
        emptyAction={createButton}
      >
        <CustomTable
          columns={columns}
          rows={categories}
          getRowKey={(row) => row._id}
          rowLabel={(row) => localize(row.name)}
          caption={t("title")}
          rowActions={(row) => (
            <CategoryRowActions
              name={localize(row.name)}
              onEdit={() => {
                setEditing(row);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(row)}
            />
          )}
          actionsLabel={tTable("actions")}
        />
      </PageContent>
      <MoveFocusEffect lastMove={lastMove} version={categories} />
      <CategoryFormSheet
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
      <DeleteCategoryDialog
        key={deleting?._id ?? "none"}
        target={deleting}
        categories={categories}
        onClose={() => setDeleting(null)}
      />
    </PageShell>
  );
};

export default AdminCategoriesBoard;
