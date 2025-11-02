import { Card } from "./ui/card";
import innovationIcon from "@/assets/icon-innovation.png";
import qualityIcon from "@/assets/icon-quality.png";
import partnershipIcon from "@/assets/icon-partnership.png";

const services = [
  {
    icon: innovationIcon,
    title: "Innovation",
    description:
      "Cutting-edge solutions that push boundaries and drive your business forward with the latest technologies and methodologies.",
  },
  {
    icon: qualityIcon,
    title: "Premium Quality",
    description:
      "Meticulous attention to detail ensures every deliverable meets the highest standards of excellence and precision.",
  },
  {
    icon: partnershipIcon,
    title: "True Partnership",
    description:
      "Collaborative approach focused on understanding your unique needs and delivering tailored solutions that exceed expectations.",
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            What Sets Us <span className="text-accent">Apart</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            We combine expertise, innovation, and dedication to deliver
            exceptional results that drive success.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {services.map((service, index) => (
            <Card
              key={service.title}
              className="p-8 hover:shadow-[0_8px_24px_-6px_hsl(222_47%_11%/0.12)] transition-all duration-300 hover:-translate-y-2 animate-fade-in border-border bg-card"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="mb-6">
                <img
                  src={service.icon}
                  alt={service.title}
                  className="w-16 h-16 object-contain"
                />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-card-foreground">
                {service.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
