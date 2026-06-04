import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Method Skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="h-[350px] flex items-end gap-2 pt-6">
          <Skeleton className="flex-1" style={{ height: "50%" }} />
          <Skeleton className="flex-1" style={{ height: "65%" }} />
          <Skeleton className="flex-1" style={{ height: "43%" }} />
          <Skeleton className="flex-1" style={{ height: "78%" }} />
          <Skeleton className="flex-1" style={{ height: "55%" }} />
          <Skeleton className="flex-1" style={{ height: "70%" }} />
          <Skeleton className="flex-1" style={{ height: "48%" }} />
          <Skeleton className="flex-1" style={{ height: "82%" }} />
          <Skeleton className="flex-1" style={{ height: "60%" }} />
          <Skeleton className="flex-1" style={{ height: "45%" }} />
          <Skeleton className="flex-1" style={{ height: "72%" }} />
          <Skeleton className="flex-1" style={{ height: "53%" }} />
          <Skeleton className="flex-1" style={{ height: "67%" }} />
          <Skeleton className="flex-1" style={{ height: "58%" }} />
          <Skeleton className="flex-1" style={{ height: "75%" }} />
          <Skeleton className="flex-1" style={{ height: "50%" }} />
          <Skeleton className="flex-1" style={{ height: "63%" }} />
          <Skeleton className="flex-1" style={{ height: "56%" }} />
          <Skeleton className="flex-1" style={{ height: "68%" }} />
          <Skeleton className="flex-1" style={{ height: "52%" }} />
        </CardContent>
      </Card>

      {/* Tables Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
