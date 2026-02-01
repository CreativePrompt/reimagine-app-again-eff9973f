import { AppLayout } from "@/components/layout/AppLayout";
import { Timer as TimerComponent } from "@/components/editor/Timer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function Timer() {
  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Timer</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Presentation Timer</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-12">
            <TimerComponent />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
