from helpers import *
r = Run()
t = teacher(r)
add_students(t, ["سارة أحمد", "عمر خالد", "ليان محمد"])
cs = codes(t); print(cs)
r.shot(t, "base_teacher")
p = parent(r, cs[0][1])
r.shot(p, "base_parent")
r.close()
