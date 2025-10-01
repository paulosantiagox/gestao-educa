import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { VersionDisplay } from "@/components/VersionDisplay";
import { cn } from "@/lib/utils";

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Sistema de Gestão Educacional</h1>
          <VersionDisplay className="hidden sm:block" />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Relógio com segundos */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground leading-none mb-0.5">
                {formatDate(currentTime)}
              </span>
              <span className="text-sm font-mono font-semibold leading-none">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>

          {/* Calendário para consulta */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" title="Consultar calendário">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={calendarDate}
                onSelect={(date) => date && setCalendarDate(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
