const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-8 border-t border-primary-foreground/10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary-foreground to-accent bg-clip-text text-transparent">
            Pracherey
          </div>
          
          <p className="text-primary-foreground/60 text-sm">
            © 2025 Pracherey. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
