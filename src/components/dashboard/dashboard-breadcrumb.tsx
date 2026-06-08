import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const DashboardBreadcrumb = ({
  href,
  label,
  isMain,
}: {
  href: string;
  label?: string;
  isMain?: boolean;
}) => {
  return (
    <div className="flex items-center space-x-2 select-none">
      {isMain ? (
        <Link href="/" className="cursor-pointer">
          <span
            className={cn(
              "duration-300 text-lg font-bold transition-colors",
              isMain ? "text-primary" : "text-primary/80 hover:text-primary",
            )}
          >
            หน้าหลัก
          </span>
        </Link>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/" className="cursor-pointer">
              <span
                className={cn(
                  "duration-300 text-lg font-bold transition-colors",
                  isMain
                    ? "text-primary"
                    : "text-primary/80 hover:text-primary",
                )}
              >
                หน้าหลัก
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent>กลับหน้าไปที่หน้าหลัก</TooltipContent>
        </Tooltip>
      )}

      {!isMain && (
        <>
          <span className="text-primary/80">
            <ChevronRight size={16} strokeWidth={2.5} />
          </span>
          <Link href={href} className="cursor-pointer">
            <span className="text-primary text-lg font-bold">{label}</span>
          </Link>
        </>
      )}
    </div>
  );
};

export default DashboardBreadcrumb;
