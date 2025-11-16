import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { BIBLE_BOOKS } from "@/lib/bibleBooks";
import { Button } from "@/components/ui/button";

export default function Bible() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTestament, setSelectedTestament] = useState<"Old Testament" | "New Testament" | "All">("All");

  const getFilteredBooks = () => {
    let books = selectedTestament === "All" 
      ? [...BIBLE_BOOKS["Old Testament"], ...BIBLE_BOOKS["New Testament"]]
      : BIBLE_BOOKS[selectedTestament];

    if (searchQuery) {
      books = books.filter(book =>
        book.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return books;
  };

  const filteredBooks = getFilteredBooks();

  const getBookColor = (index: number) => {
    const colors = [
      "from-blue-500 to-blue-700",
      "from-purple-500 to-purple-700",
      "from-green-500 to-green-700",
      "from-red-500 to-red-700",
      "from-yellow-500 to-yellow-700",
      "from-pink-500 to-pink-700",
      "from-indigo-500 to-indigo-700",
      "from-teal-500 to-teal-700",
    ];
    return colors[index % colors.length];
  };

  return (
    <AppLayout>
      <div className="h-full overflow-auto">
        <div className="container mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Bible Library</h1>
              <p className="text-muted-foreground">ESV Translation</p>
            </div>
          </div>

          {/* Testament Filter */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={selectedTestament === "All" ? "default" : "outline"}
              onClick={() => setSelectedTestament("All")}
            >
              All Books
            </Button>
            <Button
              variant={selectedTestament === "Old Testament" ? "default" : "outline"}
              onClick={() => setSelectedTestament("Old Testament")}
            >
              Old Testament
            </Button>
            <Button
              variant={selectedTestament === "New Testament" ? "default" : "outline"}
              onClick={() => setSelectedTestament("New Testament")}
            >
              New Testament
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bookshelf Grid */}
          {filteredBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No books found</h3>
              <p className="text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredBooks.map((book, index) => (
                <motion.div
                  key={book.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card 
                    className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
                    onClick={() => navigate(`/bible/${book.name}/1`)}
                  >
                    <CardContent className="p-0">
                      <div className={`h-48 bg-gradient-to-br ${getBookColor(index)} flex flex-col items-center justify-center text-white p-4 relative`}>
                        <BookOpen className="h-12 w-12 mb-3 opacity-90" />
                        <h3 className="font-bold text-center text-lg mb-1">{book.name}</h3>
                        <p className="text-xs opacity-90">{book.chapters} chapters</p>
                        
                        {/* Book spine effect */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/20"></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
