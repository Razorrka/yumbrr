"""Generate the app icon (a fish on a teal ground) as PNG, no dependencies."""
import zlib, struct

BG   = (0x0D, 0x6A, 0x6E)
BODY = (0xF2, 0xF6, 0xF6)
SS   = 3  # supersample factor for smooth edges


def inside(fx, fy):
    """Fish silhouette in unit space: elliptical body, triangular tail."""
    bx, by, rx, ry = 0.455, 0.50, 0.295, 0.185
    dx, dy = (fx - bx) / rx, (fy - by) / ry
    if dx * dx + dy * dy <= 1.0:
        return True
    # tail: triangle behind the body, tapering toward the spine
    if 0.72 <= fx <= 0.895:
        t = (fx - 0.72) / 0.175
        half = 0.028 + t * 0.15
        if abs(fy - 0.50) <= half:
            return True
    return False


def eye(fx, fy):
    return (fx - 0.295) ** 2 + (fy - 0.452) ** 2 <= 0.031 ** 2


def render(size):
    row = []
    for y in range(size):
        line = bytearray()
        for x in range(size):
            hit = 0
            for sy in range(SS):
                for sx in range(SS):
                    fx = (x + (sx + 0.5) / SS) / size
                    fy = (y + (sy + 0.5) / SS) / size
                    if inside(fx, fy) and not eye(fx, fy):
                        hit += 1
            a = hit / float(SS * SS)
            line += bytes(int(round(BG[i] + (BODY[i] - BG[i]) * a)) for i in range(3))
        row.append(bytes(line))
    return b"".join(row)


def write_png(path, size):
    px = render(size)
    raw = b"".join(b"\x00" + px[y * size * 3:(y + 1) * size * 3] for y in range(size))

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) +
                chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    return path


if __name__ == "__main__":
    for s, name in ((180, "assets/icon-180.png"), (512, "assets/icon-512.png")):
        write_png(name, s)
        print("wrote", name)
