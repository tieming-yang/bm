"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  FilterFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDownIcon } from "lucide-react";

import Loading from "@/app/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import Auth from "@/models/auth";
import Profile from "@/models/profiles";
import {
  EVENT_SLUG,
  GRADE_OPTIONS,
  SummerCampDashboardStudentRow,
} from "@/app/(works)/school/summer/2026/domain";
import { QueryKey } from "@/utils/query-keys";

const dashboardGlobalFilter: FilterFn<SummerCampDashboardStudentRow> = (row, _columnId, value) => {
  const query = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!query) return true;

  const searchableContent = [
    row.original.childFullName,
    row.original.grade,
    row.original.parentFullName,
    row.original.parentEmail,
    row.original.parentCellPhone,
    row.original.parentAddress,
    row.original.emergencyContactName,
    row.original.emergencyContactPhone,
    row.original.allergies,
    row.original.submittedAt,
  ]
    .join(" ")
    .toLowerCase();

  return searchableContent.includes(query);
};

function SortableHeader({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto font-medium text-left"
      onClick={onClick}
    >
      <span>{title}</span>
      <ArrowUpDownIcon className="w-4 h-4 ml-2" />
    </Button>
  );
}

function getColumns(
  t: (key: string, options?: Record<string, unknown>) => string,
  tCommon: (key: string, options?: Record<string, unknown>) => string
): ColumnDef<SummerCampDashboardStudentRow>[] {
  const columns: ColumnDef<SummerCampDashboardStudentRow>[] = [
    {
      accessorKey: "childFullName",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.childFullName")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
    },
    {
      accessorKey: "grade",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.grade")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        return row.getValue(columnId) === filterValue;
      },
    },
    {
      accessorKey: "birthday",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.birthday")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => format(parseISO(row.original.birthday), "PPP"),
    },
    {
      accessorKey: "allergies",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.allergies")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => row.original.allergies || "—",
    },
    {
      accessorKey: "parentFullName",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.parentFullName")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
    },
    {
      accessorKey: "parentEmail",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.parentEmail")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
    },
    {
      accessorKey: "parentCellPhone",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.parentCellPhone")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
    },
    {
      accessorKey: "parentAddress",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.parentAddress")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => (
        <span className="whitespace-normal min-w-72">{row.original.parentAddress}</span>
      ),
    },
    {
      accessorKey: "emergencyContactName",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.emergencyContactName")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
    },
    {
      accessorKey: "emergencyContactPhone",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.emergencyContactPhone")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
    },
    {
      accessorKey: "isEbVolunteer",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.isEbVolunteer")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) =>
        row.original.isEbVolunteer === null
          ? "—"
          : row.original.isEbVolunteer
            ? tCommon("yes")
            : tCommon("no"),
    },
    {
      accessorKey: "isChurchMember",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.isChurchMember")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) =>
        row.original.isChurchMember === null
          ? "—"
          : row.original.isChurchMember
            ? tCommon("yes")
            : tCommon("no"),
    },
    {
      accessorKey: "liabilityMedicalRelease",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.liabilityMedicalRelease")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => (row.original.liabilityMedicalRelease ? tCommon("yes") : tCommon("no")),
    },
    {
      accessorKey: "imageRelease",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.imageRelease")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => (row.original.imageRelease ? tCommon("yes") : tCommon("no")),
    },
    {
      accessorKey: "submittedAt",
      header: ({ column }) => (
        <SortableHeader
          title={t("school.dashboard.columns.submittedAt")}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => format(parseISO(row.original.submittedAt), "PPP p"),
    },
  ];

  return columns;
}

export default function DashboardClientPage() {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();
  const { t } = useTranslation("school");
  const { t: tCommon } = useTranslation("common");
  const [sorting, setSorting] = useState<SortingState>([{ id: "submittedAt", desc: true }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      router.replace("/signin?redirectTo=%2Fdashboard");
    }
  }, [authUser, isAuthUserLoading, router]);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: QueryKey.profile(authUser?.uid ?? "dashboard"),
    queryFn: () => Profile.get(authUser!.uid),
    enabled: !!authUser?.uid,
  });

  const canViewDashboard = Profile.isPrivilegedRole(profile?.role);

  const { data: rows = [], isLoading: isRowsLoading } = useQuery({
    queryKey: ["school", EVENT_SLUG, "dashboard-rows"],
    queryFn: async () => {
      const token = await Auth.user?.getIdToken();
      const response = await fetch(`/api/school/events/${EVENT_SLUG}/registrations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to load registrations");
      }

      return (result.rows ?? []) as SummerCampDashboardStudentRow[];
    },
    enabled: !!authUser && canViewDashboard,
  });

  const table = useReactTable({
    data: rows,
    columns: getColumns(t, tCommon),
    state: {
      sorting,
      globalFilter: deferredSearchQuery,
      columnFilters: gradeFilter ? [{ id: "grade", value: gradeFilter }] : [],
    },
    onSortingChange: setSorting,
    globalFilterFn: dashboardGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isAuthUserLoading || (authUser && isProfileLoading) || (canViewDashboard && isRowsLoading)) {
    return <Loading />;
  }

  if (!authUser) {
    return <Loading />;
  }

  if (!canViewDashboard) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("school.dashboard.accessDeniedTitle")}</CardTitle>
            <CardDescription>{t("school.dashboard.accessDeniedDescription")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-4 py-10 mx-auto font-serif min-h-svh gap-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("school.dashboard.title")}</CardTitle>
          <CardDescription>{t("school.dashboard.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("school.dashboard.searchPlaceholder")}
              className="lg:max-w-xl"
            />
            <Select
              value={gradeFilter || "all"}
              onValueChange={(value) => setGradeFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="lg:max-w-xs">
                <SelectValue placeholder={t("school.dashboard.gradeFilterPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("school.dashboard.gradeFilterAll")}</SelectItem>
                {GRADE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className="text-center text-muted-foreground"
                  >
                    {t("school.dashboard.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
