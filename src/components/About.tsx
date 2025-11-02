import { CheckCircle2 } from "lucide-react";

const features = [
  "Industry-leading expertise and proven track record",
  "Dedicated team of professionals committed to your success",
  "Innovative solutions tailored to your specific needs",
  "Transparent communication and collaborative approach",
  "Continuous support and long-term partnership",
  "Commitment to excellence in every project",
];

const About = () => {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-slide-in-left">
              <h2 className="text-4xl md:text-5xl font-bold">
                Why Choose <span className="text-accent">Pracherey</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                With over 15 years of experience, we've built a reputation for
                delivering exceptional results that exceed expectations. Our
                commitment to innovation and quality has made us a trusted
                partner for businesses worldwide.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We believe in building lasting relationships through transparency,
                dedication, and a genuine commitment to your success. Every
                project is an opportunity to demonstrate our expertise and
                deliver value that drives your business forward.
              </p>
            </div>

            <div className="space-y-4 animate-fade-in [animation-delay:300ms]">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <CheckCircle2 className="text-accent flex-shrink-0 mt-1" size={24} />
                  <p className="text-foreground">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
