using JanePacheco.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace JanePacheco.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<ServiceItem> Services => Set<ServiceItem>();
    public DbSet<Professional> Professionals => Set<Professional>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<ClinicSettings> Settings => Set<ClinicSettings>();
    public DbSet<Photo> Photos => Set<Photo>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<ServiceItem>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(120);
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.Category).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Price).HasPrecision(10, 2);
        });

        b.Entity<Professional>(e => e.Property(x => x.Name).HasMaxLength(120));

        b.Entity<Appointment>(e =>
        {
            e.HasIndex(x => new { x.Date, x.ProfessionalId });
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Category).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Price).HasPrecision(10, 2);
            e.Property(x => x.ClientName).HasMaxLength(120);
            e.Property(x => x.ClientPhone).HasMaxLength(30);
            e.Property(x => x.ServiceName).HasMaxLength(120);
            e.Property(x => x.Origin).HasMaxLength(20);
            e.HasOne(x => x.Service).WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Professional).WithMany().HasForeignKey(x => x.ProfessionalId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<ClinicSettings>().Property(x => x.Id).ValueGeneratedNever();
    }
}
