using JanePacheco.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace JanePacheco.Api.Data;

public static class Seed
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (!await db.Settings.AnyAsync())
        {
            db.Settings.Add(new ClinicSettings
            {
                Tagline = "Cuidado de pele e corpo com protocolos pensados para você, em um espaço feito para desacelerar.",
                About = "Cada atendimento começa com escuta. Antes de qualquer protocolo, a Jane avalia sua pele, entende sua rotina e o resultado que você procura, para indicar o tratamento certo, no ritmo certo.\n\nO objetivo é sempre um resultado natural: você, com a pele mais saudável e a autoestima em dia."
            });
        }

        if (!await db.Professionals.AnyAsync())
            db.Professionals.Add(new Professional { Name = "Jane Pacheco" });

        if (!await db.Services.AnyAsync())
        {
            var i = 0;
            ServiceItem S(string name, Category cat, int dur, decimal price, string desc) =>
                new() { Name = name, Category = cat, DurationMin = dur, Price = price, Description = desc, SortOrder = i++ };

            db.Services.AddRange(
                S("Limpeza de pele", Category.Facial, 60, 150, "Higienização profunda, extração cuidadosa e hidratação para uma pele leve, limpa e luminosa."),
                S("Peeling químico", Category.Facial, 45, 180, "Renovação celular que suaviza manchas, textura irregular e marcas, com resultado uniforme."),
                S("Microagulhamento", Category.Facial, 60, 350, "Estímulo natural de colágeno para firmeza, poros refinados e melhora de cicatrizes."),
                S("Design de sobrancelhas", Category.Facial, 30, 60, "Desenho feito sob medida para valorizar o seu olhar com naturalidade."),
                S("Drenagem linfática", Category.Corporal, 60, 120, "Movimentos suaves que reduzem inchaço e retenção de líquidos, com sensação imediata de leveza."),
                S("Massagem modeladora", Category.Corporal, 60, 130, "Manobras firmes que ajudam a contornar o corpo e melhorar a aparência da celulite."),
                S("Radiofrequência", Category.Corporal, 45, 150, "Tecnologia que aquece as camadas da pele para mais firmeza e contorno."),
                S("Avaliação", Category.Outro, 30, 0, "Uma conversa para entender a sua pele, seus objetivos e montar o protocolo ideal.")
            );
        }

        await db.SaveChangesAsync();
    }
}
