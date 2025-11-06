import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TEMPLATES } from "@/lib/templates";
import { useSermonStore } from "@/lib/store/sermonStore";
import { getBlockIcon } from "@/lib/colors";
import { FileText, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Templates() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createSermonFromTemplate } = useSermonStore();

  // Authentication check removed - allow viewing without login

  const handleUseTemplate = async (templateKey: string) => {
    try {
      const sermon = await createSermonFromTemplate(templateKey);
      navigate(`/sermon/${sermon.id}`);
    } catch (error) {
      console.error("Error creating sermon from template:", error);
    }
  };

  // Removed auth loading check - allow access without login

  return (
    <AppLayout>
      <div className="flex-1 px-6 md:px-10 py-8 overflow-auto bg-background">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sermon Templates</h1>
          <p className="text-muted-foreground">
            Choose from proven sermon structures to jumpstart your writing
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((template, index) => (
            <motion.div
              key={template.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4 mb-2">
                    <div className="h-12 w-12 rounded-xl bg-[hsl(var(--soft-blue-light))] flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-[hsl(var(--soft-blue))]" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="mb-2">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Block Preview */}
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Includes {template.blocks.length} blocks:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {template.blocks.slice(0, 6).map((block, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted"
                        >
                          <span>{getBlockIcon(block.kind)}</span>
                          <span className="capitalize">{block.kind.replace("_", " ")}</span>
                        </span>
                      ))}
                      {template.blocks.length > 6 && (
                        <span className="text-xs px-2 py-1 text-muted-foreground">
                          +{template.blocks.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Use Template Button */}
                  <Button
                    className="w-full shadow-sm"
                    onClick={() => handleUseTemplate(template.key)}
                  >
                    Use Template
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
