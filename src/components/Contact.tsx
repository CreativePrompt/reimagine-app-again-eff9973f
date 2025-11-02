import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Mail, MapPin, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you as soon as possible.",
    });
  };

  return (
    <section id="contact" className="py-24 bg-gradient-to-br from-primary via-primary to-[hsl(222_30%_25%)] text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Let's Work <span className="text-accent">Together</span>
            </h2>
            <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
              Ready to start your project? Get in touch and let's create
              something exceptional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8 animate-slide-in-left">
              <div>
                <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-accent/20 p-3 rounded-lg">
                      <Mail className="text-accent" size={24} />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Email</div>
                      <a
                        href="mailto:info@pracherey.com"
                        className="text-primary-foreground/80 hover:text-accent transition-colors"
                      >
                        info@pracherey.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-accent/20 p-3 rounded-lg">
                      <Phone className="text-accent" size={24} />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Phone</div>
                      <a
                        href="tel:+1234567890"
                        className="text-primary-foreground/80 hover:text-accent transition-colors"
                      >
                        +1 (234) 567-890
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-accent/20 p-3 rounded-lg">
                      <MapPin className="text-accent" size={24} />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Location</div>
                      <p className="text-primary-foreground/80">
                        Global Offices
                        <br />
                        Serving Clients Worldwide
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-primary-foreground/20">
                <p className="text-primary-foreground/70">
                  Available Monday - Friday
                  <br />
                  9:00 AM - 6:00 PM EST
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in [animation-delay:300ms]">
              <div>
                <Input
                  type="text"
                  placeholder="Your Name"
                  required
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:border-accent"
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Your Email"
                  required
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:border-accent"
                />
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Subject"
                  required
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:border-accent"
                />
              </div>
              <div>
                <Textarea
                  placeholder="Your Message"
                  required
                  rows={6}
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:border-accent resize-none"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-[0_0_32px_hsl(43_74%_66%/0.4)] transition-all duration-300"
              >
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
